import uuid

from django.utils import timezone
from django.db import models
from django.db.models import Q
from django.db.models.signals import post_save, post_delete
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from cinp.orm_django import DjangoCInP as CInP

from contractor.fields import MapField, JSONField, name_regex, config_name_regex
from contractor.Site.models import Site
from contractor.BluePrint.models import StructureBluePrint, FoundationBluePrint
from contractor.Utilities.models import Network, Networked, RealNetworkInterface
from contractor.lib.config import getConfig, mergeValues
from contractor.Records.lib import post_save_callback, post_delete_callback

# this is where the plan meets the resources to make it happen, the actuall impelemented thing, and these represent things, you can't delete the records without cleaning up what ever they are pointing too

cinp = CInP( 'Building', '0.1' )

FOUNDATION_SUBCLASS_LIST = []
COMPLEX_SUBCLASS_LIST = []


class BuildingException( ValueError ):
  def __init__( self, code, message ):
    super().__init__( message )
    self.message = message
    self.code = code

  @property
  def response_data( self ):
    return { 'exception': 'BuildingException', 'error': self.code, 'message': self.message }

  def __str__( self ):
    return 'BuildingException ({0}): {1}'.format( self.code, self.message )


@cinp.model( property_list=( 'state', 'type', 'class_list', { 'name': 'structure', 'type': 'Model', 'model': 'contractor.Building.models.Structure' } ), not_allowed_verb_list=[ 'CREATE' ] )  # CREATE should be done with the subclasses
class Foundation( models.Model ):
  locator = models.CharField( max_length=100, primary_key=True )  # if this changes make sure to update architect - instance - foundation_id
  site = models.ForeignKey( Site, on_delete=models.PROTECT )
  blueprint = models.ForeignKey( FoundationBluePrint, on_delete=models.PROTECT )
  id_map = JSONField( blank=True, null=True )  # ie a dict of asset, chassis, system, etc types
  located_at = models.DateTimeField( editable=False, blank=True, null=True )
  built_at = models.DateTimeField( editable=False, blank=True, null=True )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  def _canSetState( self, job=None ):  # You can't set state if there is a related job, unless that job (that is hopfully being passed in from the job that is calling this) is that related job
    try:
      self.cartographer
      return False
    except ObjectDoesNotExist:
      pass

    try:
      return self.foundationjob == job
    except ObjectDoesNotExist:
      pass

    try:
      self.structure.structurejob
      return False
    except ( ObjectDoesNotExist, AttributeError ):
      pass

    return True

  def setLocated( self ):
    """
    Sets the Foundation to 'located' state.  This will not create/destroy any jobs.
    """
    try:
      job = self.foundationjob
      if job.script_name != 'create':
        job = None

    except ObjectDoesNotExist:
      job = None

    if not self._canSetState( job ):
      raise Exception( 'All related jobs and cartographer instances must be cleared before setting Located' )

    if self.structure is not None and self.structure.state != 'planned':
      raise Exception( 'Attached Structure must be in Planned state' )

    if self.blueprint.getValidationTemplate() is not None and not self.id_map:
      raise Exception( 'Foundations with blueprints, which specify templates, require id_map to be set before setting to Located' )

    self.located_at = timezone.now()
    self.built_at = None
    self.full_clean()
    self.save()

  def setBuilt( self, job=None ):
    """
    Set the Foundation to 'built' state.  This will not create/destroy any jobs.
    """
    if not self._canSetState( job ):
      raise Exception( 'All related jobs and cartographer instances must be cleared before setting Built' )

    if self.located_at is None:
      if self.blueprint.getValidationTemplate() is not None:
        raise Exception( 'Foundation with Blueprints with templates must be located first' )
      self.located_at = timezone.now()

    self.built_at = timezone.now()
    self.full_clean()
    self.save()

  def setDestroyed( self, job=None ):
    """
    Sets the Foundation to 'destroyed' state.  This will not create/destroy any jobs.

    NOTE: This will set the attached structure (if there is one) to 'planned' without running a job to destroy the structure.
    """
    if not self._canSetState( job ):
      raise Exception( 'All related jobs and cartographer instances must be cleared before setting Destroyed' )

    try:
      self.structure.setDestroyed()  # TODO: this may be a little harsh
    except AttributeError:
      pass

    for iface in self.networkinterface_set.all():
      iface = iface.subclass
      if iface.type == 'Real':
        iface.pxe = None

      iface.mac = None
      iface.full_clean()
      iface.save()

    self.built_at = None
    self.located_at = None
    self.id_map = None
    self.full_clean()
    self.save()

  @staticmethod
  def getTscriptValues( write_mode=False ):  # locator is handled seperatly
    return {  # none of these base items are writeable, ignore the write_mode for now
              'locator': ( lambda foundation: foundation.locator, None ),  # redundant?
              'type': ( lambda foundation: foundation.subclass.type, None ),  # redudnant?
              'site': ( lambda foundation: foundation.site.pk, None ),
              'blueprint': ( lambda foundation: foundation.blueprint.pk, None ),
              # 'ip_map': ( lambda foundation: foundation.ip_map, None ),
              'interface_list': ( lambda foundation: [ i for i in foundation.networkinterface_set.all().order_by( 'physical_location' ) ], None )  # redudntant?
            }

  @staticmethod
  def getTscriptFunctions():
    return {}

  def configAttributes( self ):
    provisioning_interface = self.provisioning_interface
    return {
              '_provisioning_interface': provisioning_interface.physical_location if provisioning_interface is not None else None,  # what ever deals with the provisioning interface will have to deal with the physical_location, otherwise tools that are not the final target OS will be confused
              '_provisioning_interface_mac': provisioning_interface.mac if provisioning_interface is not None else None,
              '_foundation_id': self.pk,
              '_foundation_type': self.type,
              '_foundation_state': self.state,
              '_foundation_class_list': self.class_list,
              '_foundation_locator': self.locator,
              '_foundation_id_map': self.id_map,
              '_console': self.console
            }

  @property
  def console( self ):
    return 'console'

  @property
  def provisioning_interface( self ):
    try:
      return self.networkinterface_set.get( is_provisioning=True )
    except ObjectDoesNotExist:
      return None

  @property
  def subclass( self ):
    for attr in FOUNDATION_SUBCLASS_LIST:
      try:
        return getattr( self, attr )
      except AttributeError:
        pass

    return self

  @property
  def type( self ):
    real = self.subclass
    if real != self:
      return real.type

    return 'Unknown'

  @property
  def class_list( self ):
    # top level generic classes: Metal, VM, Container, Switch, PDU
    return []

  @property
  def complex( self ):
    return None

  @property
  def can_delete( self ):
    if self.state not in ( 'located', 'planned' ):
      return False

    if self.structure is not None:
      return False

    if self.getJob() is not None:
      return False

    return True

  @property
  def structure( self ):
    try:
      return Structure.objects.get( foundation=self )
    except Structure.DoesNotExist:
      pass

    return None

  @property
  def state( self ):
    if self.located_at is not None and self.built_at is not None:
      return 'built'

    elif self.located_at is not None:
      return 'located'

    return 'planned'

  @property
  def description( self ):
    return self.locator

  @property
  def dependency( self ):
    try:
      return Dependency.objects.get( foundation=self )
    except Dependency.DoesNotExist:
      return None

  @property
  def dependencyId( self ):
    return 'f-{0}'.format( self.pk )

  @cinp.action( return_type={ 'type': 'String' }, paramater_type_list=[ 'Map' ] )
  def setIdMap( self, id_map ):
    error = self.blueprint.validateIdMap( id_map )
    if error is not None:
      return error

    self.id_map = id_map
    self.full_clean()
    self.save()

    for iface in RealNetworkInterface.objects.filter( foundation=self ):
      if iface.physical_location in id_map[ 'network' ]:
        iface.mac = id_map[ 'network' ][ iface.physical_location ][ 'mac' ]
        iface.full_clean()
        iface.save()

    return None

  @cinp.action( return_type='Integer', paramater_type_list=[ '_USER_' ]  )
  def doCreate( self, user ):
    """
    This will submit a job to run the create script.
    """
    from contractor.Foreman.lib import createJob
    return createJob( 'create', self, user )

  @cinp.action( return_type='Integer', paramater_type_list=[ '_USER_' ]  )
  def doDestroy( self, user ):
    """
    This will submit a job to run the destroy script.
    """
    from contractor.Foreman.lib import createJob
    return createJob( 'destroy', self, user )

  @cinp.action( return_type='Integer', paramater_type_list=[ '_USER_', 'String' ]  )
  def doJob( self, user, name ):
    """
    This will submit a job to run the specified script.
    """
    from contractor.Foreman.lib import createJob
    if name in ( 'create', 'destroy' ):
      raise ValueError( 'Invalid Job Name' )

    return createJob( name, self, user )

  @cinp.action( return_type={ 'type': 'Model', 'model': 'contractor.Foreman.models.FoundationJob' }  )
  def getJob( self ):
    """
    Return the Job for this Foundation if there is one
    """
    try:
      return self.foundationjob
    except ObjectDoesNotExist:
      pass

    return None

  @cinp.action( { 'type': 'String', 'is_array': True } )
  @staticmethod
  def getFoundationTypes():
    return FOUNDATION_SUBCLASS_LIST

  @cinp.action( return_type='Map' )
  def getConfig( self ):
    """
    returns the computed config for this foundation
    """
    return mergeValues( getConfig( self.subclass ) )

  @cinp.action( return_type={ 'type': 'Map', 'is_array': True } )
  def getInterfaceList( self ):
    """
    returns the computed config for this foundation
    """
    return [ { 'name': i.name, 'physical_location': i.physical_location, 'is_provisioning': i.is_provisioning, 'mac': i.mac, 'pxe': i.pxe } for i in self.networkinterface_set.all().order_by( 'physical_location' ) ]

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return Foundation.objects.filter( site=site )

  @cinp.list_filter( name='todo', paramater_type_list=[ { 'type': 'Model', 'model': Site }, 'Boolean', 'String' ] )
  @staticmethod
  def filter_todo( site, has_dependancies, foundation_class ):
    args = {}
    args[ 'site' ] = site
    if has_dependancies:
      args[ 'dependency' ] = True

    if foundation_class is not None:
      if foundation_class not in FOUNDATION_SUBCLASS_LIST:
        raise ValueError( 'Invalid foundation class' )

      args[ foundation_class ] = True

    return Foundation.objects.filter( **args )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, Foundation, {
                                                                    'setIdMap': 'Building.can_bootstrap',
                                                                    'getConfig': 'Building.view_foundation',
                                                                    'getInterfaceList': 'Building.view_foundation',
                                                                    'doCreate': 'Building.can_create_foundation_job',
                                                                    'doDestroy': 'Building.can_create_foundation_job',
                                                                    'doJob': 'Building.can_create_foundation_job'
                                                                  } )

  def clean( self, *args, **kwargs ):
    super().clean( *args, **kwargs )
    errors = {}

    if not name_regex.match( self.locator ):
      errors[ 'locator' ] = 'Invalid'

    if self.blueprint_id is not None and self.type not in self.blueprint.foundation_type_list:
        errors[ 'blueprint' ] = 'Blueprint "{0}" does not list this type "{1}"'.format( self.blueprint, self.type )

    if errors:
      raise ValidationError( errors )

  def delete( self ):
    if not self.can_delete:
      raise models.ProtectedError( 'Foundation not Deleatable', self )

    subclass = self.subclass

    if self == subclass:
      super().delete()
    else:
      subclass.delete()

  class Meta:
    default_permissions = ( 'view', )
    permissions = (
                    ( 'can_create_foundation_job', 'Can Create Foundation Jobs' ),
                    ( 'can_bootstrap', 'Can send bootstrap info' )
                  )

  def __str__( self ):
    return 'Foundation "{0}" in "{1}"'.format( self.locator, self.site.pk )


def getUUID():
  return str( uuid.uuid4() )


@cinp.model( property_list=( 'state', ), read_only_list=( 'config_uuid', ) )
class Structure( Networked ):
  blueprint = models.ForeignKey( StructureBluePrint, on_delete=models.PROTECT )  # ie what to bild
  foundation = models.OneToOneField( Foundation, related_name='+', on_delete=models.PROTECT )      # ie what to build it on
  config_uuid = models.CharField( max_length=36, default=getUUID, unique=True )  # TODO: make sure the uuid isn't allready used?, it is a really big set space, not sure if it is really needed
  config_values = MapField( blank=True, null=True )
  built_at = models.DateTimeField( editable=False, blank=True, null=True )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  def _canSetState( self, job=None ):
    try:
      return self.structurejob == job
    except ObjectDoesNotExist:
      pass

    return True

  def setBuilt( self, job=None ):
    if not self._canSetState( job ):
      raise Exception( 'All related jobs must be cleared before setting Built' )

    self.built_at = timezone.now()
    self.full_clean()
    self.save()

  def setDestroyed( self, job=None ):
    if not self._canSetState( job ):
      raise Exception( 'All related jobs must be cleared before setting Destroyed' )

    self.built_at = None
    self.config_uuid = str( uuid.uuid4() )  # new on destroyed, that way we can leave anything that might still be kicking arround in the dust
    self.full_clean()
    self.save()
    for dependency in self.dependant_dependencies:
      dependency.setDestroyed()

  def configAttributes( self ):
    interface_map = {}
    for iface in self.foundation.networkinterface_set.all():
      interface_map[ iface.name ] = iface.subclass.config
      interface_map[ iface.name ][ 'address_list' ] = self.getAddressList( iface )

    for iface in self.networkinterface_set.all():
      interface_map[ iface.name ] = iface.subclass.config
      interface_map[ iface.name ][ 'address_list' ] = self.getAddressList( iface )

    provisioning_interface = self.provisioning_interface
    provisioning_address = self.provisioning_address
    primary_interface = self.primary_interface
    primary_address = self.primary_address
    result = {
               '_structure_id': self.pk,
               '_structure_state': self.state,
               '_structure_config_uuid': self.config_uuid,
               '_hostname': self.hostname,
               '_domain_name': self.domain_name,
               '_fqdn': self.fqdn,
               '_provisioning_interface': provisioning_interface.name if provisioning_interface is not None else None,  # for the structure we use the name, for the foundation the physical_location
               '_provisioning_interface_mac': provisioning_interface.mac if provisioning_interface is not None else None,
               '_provisioning_address': provisioning_address.as_dict if provisioning_address is not None else None,
               '_primary_interface': primary_interface.name if primary_interface is not None else None,
               '_primary_interface_mac': primary_interface.mac if primary_interface is not None else None,
               '_primary_address': primary_address.as_dict if primary_address is not None else None,
               '_interface_map': interface_map
             }

    return result

  @property
  def state( self ):
    if self.built_at is not None:
      return 'built'

    return 'planned'

  @property
  def can_delete( self ):
    if self.state != 'planned':
      return False

    if self.getJob() is not None:
      return False

    return True

  @property
  def description( self ):
    return self.hostname

  @property
  def dependant_dependencies( self ):
    try:
      return Dependency.objects.filter( structure=self )
    except Dependency.DoesNotExist:
      return []

  @property
  def dependencyId( self ):
    return 's-{0}'.format( self.pk )

  @cinp.action( return_type='Integer', paramater_type_list=[ '_USER_' ] )
  def doCreate( self, user ):
    from contractor.Foreman.lib import createJob
    return createJob( 'create', self, user )

  @cinp.action( return_type='Integer', paramater_type_list=[ '_USER_' ] )
  def doDestroy( self, user ):
    from contractor.Foreman.lib import createJob
    return createJob( 'destroy', self, user )

  @cinp.action( return_type='Integer', paramater_type_list=[ '_USER_', 'String' ]  )
  def doJob( self, user, name ):
    from contractor.Foreman.lib import createJob
    if name in ( 'create', 'destroy' ):
      raise ValueError( 'Invalid Job Name' )

    return createJob( name, self, user )

  @cinp.action( return_type={ 'type': 'Model', 'model': 'contractor.Foreman.models.StructureJob' }  )
  def getJob( self ):
    try:
      return self.structurejob
    except ObjectDoesNotExist:
      pass

    return None

  @cinp.action( return_type='Map' )
  def getConfig( self ):
    return mergeValues( getConfig( self ) )

  @cinp.action( return_type='Map', paramater_type_list=[ 'Map' ] )
  def updateConfig( self, config_value_map ):  # TODO: this is a bad Idea, need to figure out a better way to do this, at least restrict it to accounts that can create/updatre structures
    self.config_values.update( config_value_map )
    self.full_clean()
    self.save()

    return mergeValues( getConfig( self ) )

  @cinp.action( return_type={ 'type': 'Model', 'model': 'contractor.Building.models.Structure' }, paramater_type_list=[ { 'type': 'Model', 'model': Site }, 'String' ] )
  @staticmethod
  def getWithHostnameSite( site, hostname ):
    try:
      return Structure.objects.get( site=site, hostname=hostname )
    except Structure.DoesNotExist:
      return None

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return Structure.objects.filter( site=site )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, Structure, {
                                                                   'getConfig': 'Building.view_structure',
                                                                   'doCreate': 'Building.can_create_structure_job',
                                                                   'doDestroy': 'Building.can_create_structure_job',
                                                                   'doJob': 'Building.can_create_structure_job',
                                                                   'updateConfig': 'Building.can_config_structure'
                                                                  } )

  def clean( self, *args, **kwargs ):
    super().clean( *args, **kwargs )
    errors = {}

    if self.foundation_id is not None and self.foundation.blueprint not in self.blueprint.combined_foundation_blueprint_list:
      errors[ 'foundation' ] = 'The blueprint "{0}" is not allowed on foundation "{1}"'.format( self.blueprint, self.foundation.blueprint )

    if self.config_values is not None:
      for name in self.config_values:
        if not config_name_regex.match( name ):
          errors[ 'config_values' ] = 'config item name "{0}" is invalid'.format( name )
          break

    if errors:
      raise ValidationError( errors )

  def delete( self ):
    if not self.can_delete:
      raise models.ProtectedError( 'Structure not Deleteable', self )

    super().delete()

  class Meta:
    # default_permissions = ( 'add', 'change', 'delete', 'view' )
    permissions = (
                    ( 'can_create_structure_job', 'Can Create Structure Jobs' ),
                    ( 'can_config_structure', 'Can Update Structure Config Values' )
                  )

  def __str__( self ):
    return 'Structure #{0}({1}) in "{2}"'.format( self.pk, self.hostname, self.site.pk )


@cinp.model( property_list=( 'state', 'type' ) )
class Complex( models.Model ):  # group of Structures, ie a cluster
  name = models.CharField( max_length=40, primary_key=True )  # update Architect if this changes max_length
  site = models.ForeignKey( Site, on_delete=models.CASCADE )
  description = models.CharField( max_length=200 )
  members = models.ManyToManyField( Structure, through='ComplexStructure' )
  built_percentage = models.IntegerField( default=90 )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  @property
  def subclass( self ):
    for attr in COMPLEX_SUBCLASS_LIST:
      try:
        return getattr( self, attr )
      except AttributeError:
        pass

    return self

  @property
  def state( self ):  # TODO: should we detect if the state has gone back to planned and set all the attached foundations to planned when that happens?
    state_list = [ 1 if i.state == 'built' else 0 for i in self.members.all() ]

    if len( state_list ) == 0:
      return 'planned'

    if ( sum( state_list ) * 100 ) / len( state_list ) >= self.built_percentage:
      return 'built'

    return 'planned'

  @property
  def type( self ):
    real = self.subclass
    if real != self:
      return real.type

    return 'Unknown'

  @property
  def dependencyId( self ):
    return 'c-{0}'.format( self.pk )

  def configAttributes( self ):
    return {}

  def newFoundation( self, hostname ):
    raise ValueError( 'Root Complex dose not support Foundations' )

  @cinp.action( return_type={ 'type': 'Model', 'model': Foundation }, paramater_type_list=[ { 'type': 'String' }, { 'type': 'Model', 'model': Site }, { 'type': 'Map', 'is_array': True } ] )
  def createFoundation( self, hostname, site, interface_map_list ):  # TODO: wrap this in a transaction, or some other way to unwrap everything if it fails
    self = self.subclass

    foundation = self.newFoundation( hostname, site )  # this should really be locator not hostname

    counter = 0
    for interface_map in interface_map_list:
      try:
        network = Network.objects.get( pk=interface_map.get( 'network_id', 1 ) )
      except Network.DoesNotExist:
        raise ValueError( 'Network "{0}" not found'.format( interface_map.get( 'network_id', 1 ) ) )

      iface = RealNetworkInterface()
      iface.foundation = foundation
      iface.physical_location = interface_map.get( 'physical_location', 'eth{0}'.format( counter ) )
      iface.name = interface_map.get( 'name', iface.physical_location )
      iface.mac = interface_map.get( 'mac', None )
      iface.link_name = interface_map.get( 'link_name', None )
      iface.is_provisioning = interface_map.get( 'is_provisioning', bool( counter == 0 ) )
      iface.network = network
      iface.full_clean()
      iface.save()
      counter += 1

    return foundation

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return Complex.objects.filter( site=site )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, Complex, { 'createFoundation': 'Building.can_create_foundation' } )

  def clean( self, *args, **kwargs ):
    super().clean( *args, **kwargs )
    errors = {}
    if not name_regex.match( self.name ):
      errors[ 'name' ] = 'invalid'

    if errors:
      raise ValidationError( errors )

  class Meta:
    default_permissions = ( 'view', )
    permissions = (
                    ( 'can_create_foundation', 'Can Create Foundations' ),
                  )

  def __str__( self ):
    return 'Complex "{0}"({1})'.format( self.description, self.name )


@cinp.model( )
class ComplexStructure( models.Model ):
  complex = models.ForeignKey( Complex, on_delete=models.CASCADE )
  structure = models.OneToOneField( Structure, on_delete=models.CASCADE )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  @staticmethod
  def getTscriptValues( write_mode=False ):  # locator is handled seperatly
    return {  # none of these base items are writeable, ignore the write_mode for now
              'id': ( lambda foundation: foundation.pk, None ),
              'type': ( lambda foundation: foundation.subclass.type, None ),
              'site': ( lambda foundation: foundation.site.pk, None )
            }

  @staticmethod
  def getTscriptFunctions():
    return {}

  def configAttributes( self ):
    return {
              '_complex_id': self.pk,
              '_complex_type': self.type,
              '_complex_state': self.state,
            }

  @property
  def subclass( self ):
    for attr in COMPLEX_SUBCLASS_LIST:
      try:
        return getattr( self, attr )
      except AttributeError:
        pass

    return self

  # @cinp.action( return_type='String' )
  # def getRealFoundationURI( self ):  # TODO: this is such a hack, figure  out a better way
  #   subclass = self.subclass
  #   class_name = type( subclass ).__name__
  #   if class_name == 'Foundation':
  #     return '/api/v1/Building/Foundation:{0}:'.format( subclass.pk )
  #
  #   elif class_name == 'VirtualBoxFoundation':
  #     return '/api/v1/VirtualBox/VirtualBoxFoundation:{0}:'.format( subclass.pk )
  #
  #   elif class_name == 'ManualFoundation':
  #     return '/api/v1/Manual/ManualFoundation:{0}:'.format( subclass.pk )
  #
  #   raise ValueError( 'Unknown Foundation class "{0}"'.format( class_name ) )
  #
  @cinp.action( return_type='Map' )
  def getConfig( self ):
    return mergeValues( getConfig( self.subclass ) )

  @property
  def type( self ):
    real = self.subclass
    if real != self:
      return real.type

    return 'Unknown'

  @property
  def state( self ):
    return 'Built'

  @cinp.list_filter( name='complex', paramater_type_list=[ { 'type': 'Model', 'model': Complex } ] )
  @staticmethod
  def filter_complex( complex ):
    return ComplexStructure.objects.filter( complex=complex )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, ComplexStructure, { 'getConfig', 'Building.view_complexstructure' } )

  # TODO: need to make sure a Structure is in only one complex
  def clean( self, *args, **kwargs ):
    super().clean( *args, **kwargs )
    errors = {}

    if errors:
      raise ValidationError( errors )

  class Meta:
    pass
    # default_permissions = ( 'add', 'change', 'delete', 'view' )

  def __str__( self ):
    return 'ComplexStructure for "{0}" to "{1}"'.format( self.complex, self.structure )


@cinp.model( property_list=( 'state', ) )
class Dependency( models.Model ):
  LINK_CHOICES = ( 'soft', 'hard' )  # a hardlink if the structure is set back pulls the foundation back with it, soft does not
  structure = models.ForeignKey( Structure, on_delete=models.CASCADE, related_name='+', blank=True, null=True )  # depending on this
  dependency = models.ForeignKey( 'self', on_delete=models.CASCADE, related_name='+', blank=True, null=True )  # or this
  foundation = models.OneToOneField( Foundation, on_delete=models.CASCADE, related_name='+', blank=True, null=True )  # this is what is depending
  script_structure = models.ForeignKey( Structure, on_delete=models.CASCADE, related_name='+', blank=True, null=True )  # if this is specified, the script runs on this
  link = models.CharField( max_length=4, choices=[ ( i, i ) for i in LINK_CHOICES ] )
  create_script_name = models.CharField( max_length=40, blank=True, null=True )   # optional script name, this job must complete before built_at is set
  destroy_script_name = models.CharField( max_length=40, blank=True, null=True )   # optional script name, this job is run before destroying
  built_at = models.DateTimeField( editable=False, blank=True, null=True )
  updated = models.DateTimeField( editable=False, auto_now=True )
  created = models.DateTimeField( editable=False, auto_now_add=True )

  def _canSetState( self, job=None ):
    try:
      return self.dependencyjob == job
    except ObjectDoesNotExist:
      pass

    return True

  def setBuilt( self, job=None ):
    if not self._canSetState( job ):
      raise Exception( 'All related jobs must be cleared before setting Built' )

    self.built_at = timezone.now()
    self.full_clean()
    self.save()

  def setDestroyed( self, job=None ):
    if not self._canSetState( job ):
      raise Exception( 'All related jobs must be cleared before setting Destroyed' )

    self.built_at = None
    self.full_clean()
    self.save()
    for dependency in self.dependant_dependencies:
      dependency.setDestroyed()

    if self.link == 'hard' and self.foundation is not None:
        self.foundation.setDestroyed()

  @property
  def state( self ):
    if self.built_at is not None:
      return 'built'

    return 'planned'

  @property
  def can_delete( self ):
    if self.state != 'planned':
      return False

    if self.getJob() is not None:
      return False

    return True

  @property
  def site( self ):
    if self.foundation is not None:
      return self.foundation.site
    elif self.script_structure is not None:
      return self.script_structure.site
    elif self.dependency is not None:
      return self.dependency.site
    else:
      return self.structure.site

  @property
  def blueprint( self ):
    if self.script_structure is not None:
      return self.script_structure.blueprint
    elif self.structure is not None:
      return self.structure.blueprint
    else:
      return self.dependency.blueprint

  @property
  def description( self ):
    left = None
    if self.structure is not None:
      left = self.structure.hostname
    else:
      left = self.dependency.description

    right = ''
    if self.foundation is not None:
      right = self.foundation.locator

    return '{0}-{1}'.format( left, right )

  @property
  def dependant_dependencies( self ):
    try:
      return Dependency.objects.filter( dependency=self )
    except Dependency.DoesNotExist:
      return []

  @property
  def dependencyId( self ):
    return 'd-{0}'.format( self.pk )

  @cinp.action( return_type={ 'type': 'Model', 'model': 'contractor.Foreman.models.DependencyJob' }  )
  def getJob( self ):
    try:
      return self.dependencyjob
    except ObjectDoesNotExist:
      pass

    return None

  @cinp.list_filter( name='foundation', paramater_type_list=[ { 'type': 'Model', 'model': 'contractor.Building.models.Foundation' } ] )
  @staticmethod
  def filter_foundation( foundation ):
    return Dependency.objects.filter( foundation=foundation )

  @cinp.list_filter( name='site', paramater_type_list=[ { 'type': 'Model', 'model': Site } ] )
  @staticmethod
  def filter_site( site ):
    return Dependency.objects.filter( Q( foundation__site=site )
                                      | Q( foundation__isnull=True, script_structure__site=site )
                                      | Q( foundation__isnull=True, script_structure__isnull=True, dependency__structure__site=site )
                                      | Q( foundation__isnull=True, script_structure__isnull=True, structure__site=site )
                                      )

  @cinp.check_auth()
  @staticmethod
  def checkAuth( user, verb, id_list, action=None ):
    return cinp.basic_auth_check( user, verb, action, Dependency, {
                                                                    'doCreate': 'Building.can_create_dependency_job',
                                                                    'doDestroy': 'Building.can_create_dependency_job',
                                                                    'doJob': 'Building.can_create_dependency_job'
                                                                  } )

  def clean( self, *args, **kwargs ):
    super().clean( *args, **kwargs )
    errors = {}

    if self.dependency is None and self.structure is None:
      errors[ 'structure' ] = 'Either structure or dependency is required'

    if self.structure is None and self.script_structure is None:
      if self.create_script_name is not None:
        errors[ 'create_script_name' ] = 'structure or script_sctructure are required for scripts'

      if self.destroy_script_name is not None:
        errors[ 'destroy_script_name' ] = 'structure or script_sctructure are required for scripts'

    if self.create_script_name is not None and not name_regex.match( self.create_script_name ):
      errors[ 'create_script_name' ] = '"{0}" is invalid'.format( self.create_script_name )

    if self.destroy_script_name is not None and not name_regex.match( self.destroy_script_name ):
      errors[ 'destroy_script_name' ] = '"{0}" is invalid'.format( self.destroy_script_name )

    if self.destroy_script_name is not None and self.destroy_script_name == self.create_script_name:
      errors[ 'destroy_script_name' ] = 'destroy and create script must be different'

    if errors:
      raise ValidationError( errors )

  class Meta:
    # default_permissions = ( 'add', 'change', 'delete', 'view' )
    permissions = (
                    ( 'can_create_dependency_job', 'Can Create Dependency Jobs' ),
                  )

  def __str__( self ):
    structure = None
    if self.structure is not None:
      structure = self.structure
    else:
      structure = self.dependency.structure

    return 'Dependency of "{0}" on "{1}"'.format( self.foundation, structure )


post_save.connect( post_save_callback, sender=Foundation )
post_save.connect( post_save_callback, sender=Structure )
post_delete.connect( post_delete_callback, sender=Foundation )
post_delete.connect( post_delete_callback, sender=Structure )
