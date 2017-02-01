from django.db import models
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from contractor.fields import JSONField
from contractor.Site.models import Site
from contractor.Building.models import Foundation, Structure

# stuff for getting handeling tasks, everything here should be ephemerial, only things that are in progress/flight

class BaseJob( models.Model ): # abstract base class
  JOB_STATE_CHOICES = ( ( 'working', 'working' ), ( 'waiting', 'waiting' ), ( 'done', 'done' ), ( 'pause', 'pause' ), ( 'error', 'error' ) )
  site = models.ForeignKey( Site, editable=False, on_delete=models.CASCADE )
  state = models.CharField( max_length=10, choices=JOB_STATE_CHOICES )
  script_pos = JSONField()
  script_ast = JSONField()
  is_create = models.BooleanField( default=False ) # if it is neither create nor destroy, it is utility
  is_destroy = models.BooleanField( default=False )
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

    return self

  def clean( self, *args, **kwargs ): # also need to make sure a Structure is in only one complex
    super().clean( *args, **kwargs )
    if self.is_create and self.is_destroy:
      raise ValidationError( 'Can not be a create and a destroy script at the same time' )


class FoundationJob( BaseJob ):
  foundation = models.OneToOneField( Foundation, editable=False, on_delete=models.CASCADE )

  def done( self ):
    if self.is_destroy:
      self.foundation.setDestroyed()
    elif self.is_create:
      self.foundation.setBuilt()

  def __str__( self ):
    return 'FoundationJob #{0} for "{1}" in "{2}"'.format( self.pk, self.foundation.pk, self.foundation.site.pk )


class StructureJob( BaseJob ):
  structure = models.OneToOneField( Structure, editable=False, on_delete=models.CASCADE )

  def done( self ):
    if self.is_destroy:
      self.structure.setDestroyed()
    elif self.is_create:
      self.structure.setBuilt()

  def __str__( self ):
    return 'StructureJob #{0} for "{1}" in "{2}"'.format( self.pk, self.structure.pk, self.structure.site.pk )