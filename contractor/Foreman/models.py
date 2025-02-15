import pickle

from django.utils import timezone
from django.db import models
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from cinp.orm_django import DjangoCInP as CInP

from contractor.fields import JSONField
from contractor.Site.models import Site
from contractor.Building.models import Foundation, Structure, Dependency

# stuff for getting handeling tasks, everything here should be ephemerial, only things that are in progress/flight

PICKLE_PROTOCOL = 4
cinp = CInP( 'Foreman', '0.1' )


class ForemanException( ValueError ):
  def __init__( self, code, message ):
    super().__init__( message )
    self.message = message
    self.code = code

  @property
  def response_data( self ):
    return { 'exception': 'ForemanException', 'error': self.code, 'message': self.message }

  def __str__( self ):
    return 'ForemanException ({0}): {1}'.format( self.code, self.message )


@cinp.model( not_allowed_verb_list=[ 'LIST', 'GET', 'CREATE', 'UPDATE', 'DELETE' ], hide_field_list=( 'script_runner', ), property_list=( 'can_start', ) )
class BaseJob( models.Model ):
  JOB_STATE_CHOICES = ( 'queued', 'waiting', 'done', 'paused', 'error', 'aborted' )
  site = models.ForeignKey( Site, editable=False, on_delete=models.CASCADE )
  state = models.CharField( max_length=10, choices=[ ( i, i ) for i in JOB_STATE_CHOICES ] )
  status = JSONField( default=[], blank=True )
  message = models.CharField( max_length=1024, default='', blank=True )
  script_runner = models.BinaryField( editable=False )
  script_name = models.CharField( max_length=40, editable=False, default=False )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  @property
  def realJob( self ):
    try:
      return self.foundationjob
    except ObjectDoesNotExist:
      pass

    try:
      return self.structurejob
    except ObjectDoesNotExist:
      pass

    try:
      return self.dependencyjob
    except ObjectDoesNotExist:
      pass

    return self

  @property
  def can_start( self ):
    return False

  @cinp.action()
  def pause( self ):
    """
    Pause a job that is in 'queued' state state.

    Errors:
      NOT_PAUSEABLE - Job is not in state 'queued'.
    """
    if self.state != 'queued':
      raise ForemanException( 'NOT_PAUSEABLE', 'Can only pause a job if it is queued' )

    self.state = 'paused'
    self.full_clean()
    self.save()

  @cinp.action()
  def resume( self ):
    """
    Resume a job that is in 'paused' state state.

    Errors:
      NOT_PAUSED - Job is not in state 'paused'.
    """
    if self.state != 'paused':
      raise ForemanException( 'NOT_PAUSED', 'Can only resume a job if it is paused' )

    self.state = 'queued'
    self.full_clean()
    self.save()

  @cinp.action()
  def reset( self ):
    """
    Resets a job that is in 'error' state, this allows the job to try the failed step again.

    Errors:
      NOT_ERRORED - Job is not in state 'error'.
    """
    if self.state != 'error':
      raise ForemanException( 'NOT_ERRORED', 'Can only reset a job if it is in error' )

    runner = pickle.loads( self.script_runner )
    runner.clearDispatched()
    self.status = runner.status
    self.script_runner = pickle.dumps( runner, protocol=PICKLE_PROTOCOL )

    self.state = 'queued'
    self.full_clean()
    self.save()

  @cinp.action()
  def rollback( self ):
    """
    Starts the rollback for jobs that are in state 'error'.

    Errors:
      NOT_ERRORED - Job is not in state 'error'.
    """
    if self.state != 'error':
      raise ForemanException( 'NOT_ERRORED', 'Can only rollback a job if it is in error' )

    runner = pickle.loads( self.script_runner )
    msg = runner.rollback()
    if msg != 'Done':
      raise ValueError( 'Unable to rollback "{0}"'.format( msg ) )

    self.status = runner.status
    self.script_runner = pickle.dumps( runner, protocol=PICKLE_PROTOCOL )
    self.state = 'queued'
    self.full_clean()
    self.save()

  @cinp.action()
  def clearDispatched( self ):
    """
    Resets a job that is in 'queued' state, and subcontractor lost the job.  Make
    sure to verify that subcontractor has lost the job results before calling this.

    Errors:
      NOT_ERRORED - Job is not in state 'queued'.
    """
    if self.state != 'queued':
      raise ForemanException( 'NOT_ERRORED', 'Can only clear the dispatched flag a job if it is in queued state' )

    runner = pickle.loads( self.script_runner )
    runner.clearDispatched()
    self.status = runner.status
    self.script_runner = pickle.dumps( runner, protocol=PICKLE_PROTOCOL )

    self.full_clean()
    self.save()

  @cinp.action( return_type={ 'type': 'Map' }, paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def jobStats( site ):
    """
    Returns the job status
    """
    return { 'running': BaseJob.objects.filter( site=site ).count(), 'error': BaseJob.objects.filter( site=site, state__in=( 'error', 'aborted', 'paused' ) ).count() }

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerVariables( self ):
    """
    Returns variables internal to the job script
    """
    result = {}
    runner = pickle.loads( self.script_runner )

    for module in runner.value_map:
      for name in runner.value_map[ module ]:
        result[ '{0}.{1}'.format( module, name ) ] = str( runner.value_map[ module ][ name ][0]() )

    result.update( runner.variable_map )

    return result

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerState( self ):
    """
    Returns the state of the job script
    """
    result = {}
    runner = pickle.loads( self.script_runner )

    blueprint = None

    try:
      blueprint = self.foundationjob.foundation.blueprint
    except ObjectDoesNotExist:
      pass

    try:
      blueprint = self.structurejob.structure.blueprint
    except ObjectDoesNotExist:
      pass

    try:
      dependency = self.dependencyjob.dependency
      if dependency.script_structure is not None:
        blueprint = dependency.script_structure.blueprint
      else:
        blueprint = dependency.structure.blueprint
    except ObjectDoesNotExist:
      pass

    if blueprint is not None:
      result[ 'script' ] = blueprint.get_script( self.script_name )

    result[ 'cur_line' ] = runner.cur_line
    result[ 'state' ] = runner.state

    return result

  @cinp.action( return_type='String', paramater_type_list=[ 'String' ] )
  def signalComplete( self, cookie ):
    runner = pickle.loads( self.script_runner )

    for entry in runner.object_list:
      if entry.__class__.__name__ == 'SignalingPlugin':
        result = entry.signal( cookie )
        self.script_runner = pickle.dumps( runner, protocol=PICKLE_PROTOCOL )
        self.full_clean()
        self.save()
        return result

    return 'No Reciever'

  @cinp.action( return_type='String', paramater_type_list=[ 'String' ] )
  def signalAlert( self, msg ):
    self.message = msg[ 0:1024 ]
    if self.status in ( 'queued', 'paused' ):
      self.status = 'error'

    self.full_clean()
    self.save()

    return 'Alerted'

  @cinp.action( return_type='String', paramater_type_list=[ 'String' ] )
  def postMessage( self, msg ):
    self.message = msg[ 0:1024 ]
    self.full_clean()
    self.save()

    return 'Posted'

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    # TODO: action "jobStatus": this may have sensitive stuff in it, probably should auth
    return cinp.basic_auth_check( user, verb, action, BaseJob, {
                                                                 'jobStats': None,
                                                                 'signalComplete': 'Foreman.can_job_signal',
                                                                 'signalAlert': 'Foreman.can_job_signal',
                                                                 'postMessage': 'Foreman.can_job_signal',
                                                                 '*': 'Foreman.can_base_job'
                                                               } )

  def clean( self, *args, **kwargs ):  # TODO: also need to make sure a Structure is in only one complex
    super().clean( *args, **kwargs )
    errors = {}

    if self.state not in self.JOB_STATE_CHOICES:
      errors[ 'state' ] = 'Invalid'

    if errors:
      raise ValidationError( errors )

  class Meta:
    default_permissions = ()  # only CALL
    permissions = (
                    ( 'can_base_job', 'Can Work With Base Jobs' ),
                    ( 'can_job_signal', 'Can call the Job Signalling Actions' )
                  )

  def __str__( self ):
    return 'BaseJob #{0} in "{1}"'.format( self.pk, self.site.pk )


@cinp.model( not_allowed_verb_list=[ 'CREATE', 'UPDATE', 'DELETE' ], hide_field_list=( 'script_runner', ), property_list=( 'can_start', ) )
class FoundationJob( BaseJob ):
  foundation = models.OneToOneField( Foundation, editable=False, on_delete=models.CASCADE )

  def done( self ):
    if self.script_name == 'destroy':
      self.foundation.setDestroyed( self )

    elif self.script_name == 'create':
      self.foundation.setBuilt( self )

  @property
  def can_start( self ):
    if self.script_name == 'create':
      if self.foundation.state != 'located':
        return False

      if self.foundation.dependency is not None:
        return self.foundation.dependency.state == 'built'

      return True

    elif self.script_name == 'destroy':
      if self.foundation.state != 'built':
        return False

      if self.foundation.structure is not None:
        if self.foundation.structure.state != 'planned':
          return False

        try:
          self.foundation.structure.structurejob
          return False
        except ObjectDoesNotExist:
          pass

        return True

      return True

    return True

  @cinp.action()
  def pause( self ):
    """
    See BaseJob.pause
    """
    super().pause()

  @cinp.action()
  def resume( self ):
    """
    See BaseJob.resume
    """
    super().resume()

  @cinp.action()
  def reset( self ):
    """
    See BaseJob.reset
    """
    super().reset()

  @cinp.action()
  def rollback( self ):
    """
    See BaseJob.rollback
    """
    super().rollback()

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerVariables( self ):
    """
    See BaseJob.jobRunnerVariables
    """
    return super().jobRunnerVariables()

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerState( self ):
    """
    See BaseJob.jobRunnerState
    """
    return super().jobRunnerState()

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return FoundationJob.objects.filter( site=site )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, FoundationJob, { '*': 'Foreman.can_foundation_job' } )

  class Meta:
    default_permissions = ( 'view', )
    permissions = (
                    ( 'can_foundation_job', 'Can Work With Foundation Jobs' ),
                  )

  def __str__( self ):
    return 'FoundationJob #{0} for "{1}" in "{2}"'.format( self.pk, self.foundation.pk, self.foundation.site.pk )


@cinp.model( not_allowed_verb_list=[ 'CREATE', 'UPDATE', 'DELETE' ], hide_field_list=( 'script_runner', ), property_list=( 'can_start', ) )
class StructureJob( BaseJob ):
  structure = models.OneToOneField( Structure, editable=False, on_delete=models.CASCADE )

  def done( self ):
    if self.script_name == 'destroy':
      self.structure.setDestroyed( self )

    elif self.script_name == 'create':
      self.structure.setBuilt( self )

  @property
  def foundation( self ):
    return self.structure.foundation

  @property
  def can_start( self ):
    if self.script_name == 'create':
      if self.structure.state != 'planned':
        return False

      return self.structure.foundation.state == 'built'

    elif self.script_name == 'destroy':
      if self.structure.state != 'built':
        return False

      for dependency in self.structure.dependant_dependencies:
        if dependency.state != 'planned':
          return False

        try:
          dependency.dependencyjob
          return False
        except ObjectDoesNotExist:
          pass

      return True

    return True

  @cinp.action()
  def pause( self ):
    """
    See BaseJob.pause
    """
    super().pause()

  @cinp.action()
  def resume( self ):
    """
    See BaseJob.resume
    """
    super().resume()

  @cinp.action()
  def reset( self ):
    """
    See BaseJob.reset
    """
    super().reset()

  @cinp.action()
  def rollback( self ):
    """
    See BaseJob.rollback
    """
    super().rollback()

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerVariables( self ):
    """
    See BaseJob.jobRunnerVariables
    """
    return super().jobRunnerVariables()

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerState( self ):
    """
    See BaseJob.jobRunnerState
    """
    return super().jobRunnerState()

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return StructureJob.objects.filter( site=site )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, StructureJob, { '*': 'Foreman.can_structure_job' } )

  class Meta:
    default_permissions = ( 'view', )
    permissions = (
                    ( 'can_structure_job', 'Can Work With Structure Jobs' ),
                  )

  def __str__( self ):
    return 'StructureJob #{0} for "{1}" in "{2}"'.format( self.pk, self.structure.pk, self.structure.site.pk )


@cinp.model( not_allowed_verb_list=[ 'CREATE', 'UPDATE', 'DELETE' ], hide_field_list=( 'script_runner', ), property_list=( 'can_start' ) )
class DependencyJob( BaseJob ):
  dependency = models.OneToOneField( Dependency, editable=False, on_delete=models.CASCADE )

  def done( self ):
    if self.script_name == self.dependency.destroy_script_name:
      self.dependency.setDestroyed( self )

    elif self.script_name == self.dependency.create_script_name:
      self.dependency.setBuilt( self )

    else:
      raise ValueError( 'Sciprt Name "{0}" does not match the create nor destroy script names' )  # dependency jobs can only create/destroy, no named/utility jobs

  @property
  def can_start( self ):
    if self.script_name == 'create':
      if self.dependency.state != 'planned':
        return False

      if self.dependency.structure is not None:
        return self.dependency.structure.state == 'built'
      else:
        return self.dependency.dependency.state == 'built'

    elif self.script_name == 'destroy':
      if self.dependency.state != 'built':
        return False

      if self.dependency.foundation is not None:
        if self.dependency.foundation.state != 'planned':
          return False

        try:
          self.dependency.foundation.foundationjob
          return False
        except ObjectDoesNotExist:
          pass

        return True

      for dependency in self.dependency.dependant_dependencies:
        if dependency.state == 'built':
          return False

      return True

    return True

  @cinp.action()
  def pause( self ):
    """
    See BaseJob.pause
    """
    super().pause()

  @cinp.action()
  def resume( self ):
    """
    See BaseJob.resume
    """
    super().resume()

  @cinp.action()
  def reset( self ):
    """
    See BaseJob.reset
    """
    super().reset()

  @cinp.action()
  def rollback( self ):
    """
    See BaseJob.rollback
    """
    super().rollback()

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerVariables( self ):
    """
    See BaseJob.jobRunnerVariables
    """
    return super().jobRunnerVariables()

  @cinp.action( return_type={ 'type': 'Map' } )
  def jobRunnerState( self ):
    """
    See BaseJob.jobRunnerState
    """
    return super().jobRunnerState()

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return DependencyJob.objects.filter( site=site )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, DependencyJob, { '*': 'Foreman.can_dependency_job' } )

  class Meta:
    default_permissions = ( 'view', )
    permissions = (
                    ( 'can_dependency_job', 'Can Work With Dependency Jobs' ),
                  )

  def __str__( self ):
    return 'DependencyJob #{0} for "{1}" in "{2}"'.format( self.pk, self.dependency.pk, self.dependency.site.pk )


@cinp.model( not_allowed_verb_list=[ 'CREATE', 'UPDATE', 'DELETE', 'CALL' ] )
class JobLog( models.Model ):
  site = models.ForeignKey( Site, on_delete=models.CASCADE )
  job_id = models.IntegerField()
  target_id = models.CharField( max_length=100 )  # must be at least as long the pk for Foundation(Char 100), Structure(Int64), Dependency(Int64)
  target_class = models.CharField( max_length=50 )
  target_description = models.CharField( max_length=120 )
  script_name = models.CharField( max_length=50 )
  creator = models.CharField( max_length=150 )  # max length from the django.contrib.auth User.username
  started_at = models.DateTimeField( blank=True, null=True )
  finished_at = models.DateTimeField( blank=True, null=True )
  canceled_by = models.CharField( max_length=150, blank=True, null=True )  # max length from the django.contrib.auth User.username
  canceled_at = models.DateTimeField( blank=True, null=True )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  @classmethod
  def fromJob( cls, job, creator ):
    job = job.realJob

    log = cls()
    log.job_id = job.pk
    if isinstance( job, StructureJob ):
      log.target_class = 'Structure'
      log.target_id = job.structure.pk
      log.site = job.structure.site
      log.target_description = job.structure.description

    elif isinstance( job, FoundationJob ):
      log.target_class = 'Foundation'
      log.target_id = job.foundation.locator
      log.site = job.foundation.site
      log.target_description = job.foundation.description

    elif isinstance( job, DependencyJob ):
      log.target_class = 'Dependency'
      log.target_id = job.dependency.pk
      log.site = job.dependency.site
      log.target_description = job.dependency.description

    else:
      raise ValueError( 'Unknown Job Type "{0}"'.format( job.__class__.__name__ ) )

    log.script_name = job.script_name
    log.creator = creator.username
    log.full_clean()
    log.save()

  @classmethod
  def started( cls, job ):
    log = JobLog.objects.get( job_id=job.pk )
    log.started_at = timezone.now()
    log.full_clean()
    log.save()

  @classmethod
  def finished( cls, job ):
    log = JobLog.objects.get( job_id=job.pk )
    log.finished_at = timezone.now()
    log.full_clean()
    log.save()

  @classmethod
  def canceled( cls, job, by ):
    log = JobLog.objects.get( job_id=job.pk )
    log.canceled_at = timezone.now()
    log.canceled_by = by
    log.full_clean()
    log.save()

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return JobLog.objects.filter( site=site )

  @cinp.list_filter( name='job', paramater_type_list=[ 'Integer' ] )
  @staticmethod
  def filter_job( job_id ):
    return JobLog.objects.filter( job_id=job_id )

  @cinp.list_filter( name='structure', paramater_type_list=[ { 'type': 'Model', 'model': Structure } ] )
  @staticmethod
  def filter_structure( structure ):
    return JobLog.objects.filter( site=structure.site, target_class='Structure', target_id=structure.pk )

  @cinp.list_filter( name='foundation', paramater_type_list=[ { 'type': 'Model', 'model': Foundation } ] )
  @staticmethod
  def filter_foundation( foundation ):
    return JobLog.objects.filter( site=foundation.site, target_class='Foundation', target_id=foundation.locator )

  @cinp.list_filter( name='dependency', paramater_type_list=[ { 'type': 'Model', 'model': Dependency } ] )
  @staticmethod
  def filter_dependency( dependency ):
    return JobLog.objects.filter( site=dependency.site, target_class='Dependency', target_id=dependency.pk )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, JobLog )

  def delete( self ):
    raise models.ProtectedError( 'Can not delete JobLog entries', self )

  class Meta:
    default_permissions = ( 'view', )

  def __str__( self ):
    return 'JobLog for Job #{0} for "{1}"({2}) at "{3}"'.format( self.job_id, self.target_id, self.target_class, self.at )
