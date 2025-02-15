import sys
import uuid
import traceback
import datetime
import copy
import logging
from importlib import import_module
from django.conf import settings

from contractor.tscript.parser import Types


# thrown when the scipt would like to pause execution, calling run() resumes execution
class Pause( Exception ):
  pass


# resumable error, only differes from pause by the type of exception raised, execution can be resumed with run()
class ExecutionError( Exception ):
  pass


# this error is no-resumable, the script is no longer able to be run()
class UnrecoverableError( Exception ):
  pass


class ScriptError( UnrecoverableError ):
  pass


class ParamaterError( UnrecoverableError ):
  def __init__( self, name, msg, line_no=None ):
    if line_no is not None:
      msg = 'Paramater Error paramater "{0}" line {2}: {1}'.format( name, msg, line_no )
    else:
      msg = 'Paramater Error paramater "{0}": {1}'.format( name, msg )

    super().__init__( msg )
    self.name = name
    self.msg = msg
    self.line_no = line_no


class NotDefinedError( UnrecoverableError ):
  def __init__( self, name, line_no=None ):
    if line_no is not None:
      msg = 'Not Defined "{0}" line {1}'.format( name, line_no )
    else:
      msg = 'Not Defined "{0}"'.format( name )

    super().__init__( msg )
    self.name = name
    self.line_no = line_no


class Timeout( ExecutionError ):
  def __init__( self, line_no ):
    self.line_no = line_no


class Goto( Exception ):
  def __init__( self, name, line_no ):
    self.name = name
    self.line_no = line_no


class NoRollback( Exception ):
  pass

# for values in modules, the getter/setter must not block, if you need to block
# make a external function

# for an inline non-pausing/non-remote function, you only need to implement execute and value, toSubcontractor is not called if done is immeditally True.

# any exceptions raised in any of these functions will cause the job the script is running for to end up in error state. Using any Excpetions other than
# ExecutionError and UnrecoverableError will have it's Exception Name displayed in the output, otherwise it is treaded as Unrecoverable... where possible
# use ExecutionError for "normal" errors.  UnrecoverableError will case the Job to enter a perminate Error state where the job can not be resumed.

# Keep in mind that toSubcontractor may be called without the resulting value ever making it to subcontractor.  Network issues, multiple subcontractors
# not all containing all the needed plugins, etc may cause toSubcontractor's output to be discarded.  It may also be possible that subcontractor might
# lock up and never return it's results to fromSubcontractor (lock up, network issues, process terminated, etc.), design acordingly.

# it is perfectly acceptable to not complete the remote function in one request, if some communication betwee contractor and subcontractor modules is needed
# this is allowed, keep in-mind, you may need to handle retries.  When handeling retries, do not rely on counting the number of times toSubcontractor/run/done/message
# are called, it is acceptable to store local timers.

# any communication between the contractor and subcontractor pairs must happen between to/fromSubcontractor calls, if an operation requires multiple
# communicatoin routnds, keep in mind that it is possible for multiple subcontractors to be taking requests, so subcontractor must store all state
# with contractor


"""
execution flow:

first execution:
  setup()


reset/rollback event:
  rollback()
  if values to subcontractor is outstanding, that is re-sent


following executions:
  if done is False:
    run()
    set job status to status
    if value dispatched to subcontractor and returned:
      toSubcontractor() -> if not None, value dispatched to subcontractor

  if done is True:
    value is retreived and returned to script

Subcontractor returns result:
  fromSubcontractor()
  set job status to status
"""


# the module value sent to subcontractor is the same as the tscript name
# if the module value needs to be overwridden with something else, have the
# function constructor/build return a tuple, the first value will be treated
# as the module name for subcontractor, and the second is the function

class ExternalFunction( object ):
  # try to keep __init__ simple, most things should be done in setup()
  def __init__( self ):
    super().__init__()

  @property
  def done( self ):
    # return True when task is done, False when there is more to do
    # this is called every time contractor wants to know if this script can continue.
    # keep in mind that subcontractor, users, and other processes cause this to be called
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    # this is called frequently, keep it light
    # True -> can continue, False -> can not continue
    # anything else is cast to a string and treaded as a non-resumeable error
    # it is probably wise that this funcion does not do any processing, it may be call multiple times with out any other function in the class being called.
    # do not depend on value being called imeditally after done returns True, done may have to return True multiple times before the value is
    # reterieved and the object is cleaned up.  It is also possible that done may still be called after value is reterieved.
    # NOTE: if done ever returns True, it can not take that back, bad things may happen.  Including throwing exceptions, they will probably be ignored.
    return True

  @property
  def message( self ):
    # this is called when done returns False, or after fromSubContractor is called
    # the result is used to set the job status message
    # keep in mind that subcontractor, users, and other processes cause this to be called
    # this is called frequently, keep it light
    # it is probably wise that this funcion does not do any processing, it may be call multiple times with out any other function in the class being called.
    # this can be called multiple times before and after done is True and/or the  vaule has been retrieved
    return ''

  @property
  def value( self ):
    # this returns the return value of this function, called only once, after done returns True
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    # if the returned value is an instance of Exception, it is raised and the return value is None, the function is considered executed
    return None

  def run( self ):
    # called after done is checked and returns False
    # raising Pause is allowed
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    pass

  def setup( self, parms ):
    # this function is only called once when the function is first called in the script.
    # parms is a dict of the paramaters passed in from the script
    # if the params are not what they should be, raise ParamaterError
    # make sure to do strict saninity checks on the in bound paramaters.
    # do not raise Pause, any exceptions raised will cause setup to be called again, which
    # is desired when validating paramaters
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    pass

  def rollback( self ):
    # this is call if there has been an error or loss of communication/tasks with subcontractor
    # and what ever has been done so far needs to be un-done, this mostly applies for VMs
    # and such as a way to clean up any half-baked stuf
    # this must setup the process of rolling back, the regular run, to/fromSubcontractor
    # process is fallowed after rollback is called to complete the job.
    # after rollback is complete, further calls to run, to/from should start rolling forward again
    # this can also be used as a type of reset, for example after X attempts, your function
    # can throw a Pause and request user intervention, calling rollback can be used to re-set
    # the counter
    # if rollback is not possible raise NoRollback
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    raise NoRollback()

  def toSubcontractor( self ):
    # this is sent to the subcontractor
    # this should return a tuple
    # first paramater is the function inside the plugin to call, second is the value to send to the function
    # this is called initially, then again after fromSubcontractor has returnd results until done is True
    # example: return ( 'myfunc', { 'stuff': 'for', 'myfunc': 'to use' } ) # NOTE: the paramater part can be anything that is serilizable
    # if None is returned, subcontractor will not be notified to do anything
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    # subcontractor threads will be waiting on this function
    pass

  def fromSubcontractor( self, data ):
    # data will be a dict
    # this will be called once for every toSubcontractor task sent to subcontractor.  There could be external
    # logic that looks for timeout/loss of results and call rollback to start from the top
    # THIS MUST NOT HANG/PAUSE/WAIT/POLL
    # subcontractor threads will be waiting on this function, don't do anything to heavy to hold up contractor/subcontractor
    # if there is a problem with the data from subcontractor or some other fatal error occurs,
    #   have done return True and return an Exception for value, NOTE: this kills this instance of the function unless rolled back
    pass

  def __getstate__( self ):
    # return serilizable value that will be passed to __setstate__ when execution is resumed
    return {}

  def __setstate__( self, state ):
    # restore internal state from state
    pass

  def getScriptValue( self, module, name ):
    try:
      return self._runner.getValue( module, name )
    except ( NotDefinedError, ParamaterError) as e:
      raise ValueError( e )


# used internally to break execution
class Interrupt( Exception ):
  pass


class Delay( ExternalFunction ):
  def __init__( self, *args, **kwargs ):
    super().__init__( *args, **kwargs )
    self.end_at = None

  @property
  def done( self ):
    return datetime.datetime.utcnow() >= self.end_at

  @property
  def message( self ):
    return 'Waiting for {0} more seconds'.format( ( self.end_at - datetime.datetime.utcnow() ).seconds )

  def setup( self, parms ):
    seconds = 0
    minutes = 0
    hours = 0
    try:
      seconds = int( parms.get( 'seconds', 0 ) )
    except ( ValueError, TypeError ):
      raise ParamaterError( 'seconds', 'must be an integer' )

    try:
      minutes = int( parms.get( 'minutes', 0 ) )
    except ( ValueError, TypeError ):
      raise ParamaterError( 'minutes', 'must be an integer' )

    try:
      hours = int( parms.get( 'hours', 0 ) )
    except ( ValueError, TypeError ):
      raise ParamaterError( 'hours', 'must be an integer' )

    if seconds == 0 and minutes == 0 and hours == 0:
      raise ParamaterError( '<unknwon>', 'specified 0 delay, set one or more of "seconds", "minutes", "hours"' )

    self.end_at = datetime.datetime.utcnow() + datetime.timedelta( seconds=seconds, minutes=minutes, hours=hours )

  def __getstate__( self ):
    return ( self.end_at, )

  def __setstate__( self, state ):
    self.end_at = state[0]


builtin_function_map = {
                          'len': lambda array: len( array ),
                          'slice': lambda array, start, end: array[ start:end ],
                          'pop': lambda array, index=-1: array.pop( index ),
                          'append': lambda array, value: array.append( value ),
                          'index': lambda array, value: array.index( value ),
                          'pause': lambda msg: Pause( msg ),
                          'error': lambda msg: ExecutionError( msg ),
                          'fatal_error': lambda msg: UnrecoverableError( msg ),
                          'delay': Delay(),
                          'message': lambda msg: Interrupt( msg )
                        }


infix_string_operator_map = {
                              '.': lambda a, b: a + b,
                            }

infix_math_operator_map = {
                            '+': lambda a, b: a + b,
                            '-': lambda a, b: a - b,
                            '*': lambda a, b: a * b,
                            '/': lambda a, b: a / b,
                            '%': lambda a, b: a % b,
                            '^': lambda a, b: pow( a, b ),
                            '&': lambda a, b: a & b,
                            '|': lambda a, b: a | b
                          }

infix_logical_operator_map = {
                               'and': lambda a, b: a and b,
                               'or': lambda a, b: a or b,
                               '==': lambda a, b: a == b,
                               '!=': lambda a, b: a != b,
                               '>=': lambda a, b: a >= b,
                               '<=': lambda a, b: a <= b,
                               '>': lambda a, b: a > b,
                               '<': lambda a, b: a < b,
                               'not': lambda a, b: not bool( a )
                             }


def _debugDump( message, exception, ast, state ):
  import os
  from datetime import datetime

  if settings.DEBUG_DUMP_LOCATION is None:
    return

  try:
    if settings.DEBUG_DUMP_LOCATION == '*CONSOLE*':
      fp = sys.stdout
    else:
      fp = open( os.path.join( settings.DEBUG_DUMP_LOCATION, datetime.utcnow().isoformat() ), 'w' )

    fp.write( '** Message **\n' )
    fp.write( str( message ) )
    fp.write( '\n\n** AST **\n' )
    fp.write( str( ast ) )
    fp.write( '\n\n** State **\n' )
    fp.write( str( state ) )
    fp.write( '\n\n** Stack **\n' )
    for line in traceback.TracebackException( type( exception ), exception, exception.__traceback__, lookup_lines=True, capture_locals=True ).format( chain=False ):
       fp.write( line )

    if fp is not sys.stdout:
      fp.close()

  except Exception as e:
    try:
      fp.close()
    except Exception:
      pass

    print( 'Error "{0}" when writing the debug dump'.format( e ) )


def _delta_to_string( delta ):
  sign = ''
  seconds = int( delta.total_seconds() )
  if seconds < 0:
    sign = '-'
    seconds = abs( seconds )

  days = int( seconds / 86400 )
  seconds %= 86400
  hours = int( seconds / 3600 )
  seconds %= 3600
  minutes = int( seconds / 60 )
  seconds %= 60
  if days:
    return '{0}{1}:{2:02}:{3:02}:{4:02}'.format( sign, days, hours, minutes, seconds )
  elif hours:
    return '{0}{1:02}:{2:02}:{3:02}'.format( sign, hours, minutes, seconds )
  else:
    return '{0}{1:02}:{2:02}'.format( sign, minutes, seconds )


class Runner( object ):
  def __init__( self, ast ):
    super().__init__()
    self.ast = ast

    # serilize
    self.module_list = []   # list of the loaded modules
    self.object_list = []   # list of loaded embeded objects
    self.state = []         # list of ( <type>, work values, [ return value ] ), for each level of the AST to the curent execution point
    self.variable_map = {}  # map of the variables, they are all global
    self.cur_line = 0
    self.contractor_cookie = None

    # do not serlize
    self.jump_point_map = {}
    self.function_map = {}
    self.value_map = {}

    # scan for all the jump points
    for i in range( 0, len( ast[1][ '_children' ] ) ):
      child = ast[1][ '_children' ][i][1]  # jump into the line
      if child[0] == Types.JUMP_POINT:
        self.jump_point_map[ child[1] ] = i

  @property
  def line( self ):
    return self.cur_line

  @property
  def done( self ):
    return self.state == 'DONE'

  @property
  def aborted( self ):
    return self.state == 'ABORTED'

  @property
  def status( self ):  # list of ( % complete, status message )
    logging.debug( 'runner: status state: {0}'.format( self.state ) )
    if self.done or self.aborted:
      return [ ( 100.0, 'Scope', None ) ]
    if len( self.state ) == 0:
      return [ ( 0.0, 'Scope', None ) ]

    item_list = []  # ( scope position, scope length, scope type, scope data )
    operation = self.ast
    for step in self.state:  # condense into on loop, last status may be a blocking function with remote and status values
      step_type = step[0]
      try:
        step_data = step[1]
      except IndexError:
        step_data = None

      if step_type == Types.SCOPE:
        tmp = {}
        for item in ( 'description', ):
          try:
            tmp[ item ] = operation[1][ item ]
          except ( KeyError, TypeError ):
            pass

        try:
          elapsed = datetime.datetime.utcnow() - step[2]
        except IndexError:
          elapsed = datetime.timedelta(0)
        tmp[ 'time_elapsed' ] = _delta_to_string( elapsed )
        if 'expected_time' in operation[1]:
          tmp[ 'time_remaining' ] = _delta_to_string( operation[1][ 'expected_time' ] - elapsed )

        if step_data is None:  # no point in continuing, we don't know where we are
          item_list.append( ( 0, len( operation[1][ '_children' ] ), 'Scope', tmp ) )
          break

        item_list.append( ( step_data, len( operation[1][ '_children' ] ), 'Scope', tmp ) )
        operation = operation[1][ '_children' ][ step_data ]

      elif step_type == Types.WHILE:  # if a while loop is on the stack, we must be in it, keep on going
        item_list.append( ( 0, 1, 'While', { 'doing': step_data[ 'doing' ] } ) )
        if step_data[ 'doing' ] == 'expression':
          operation = operation[1][ 'expression' ]
        elif step_data[ 'doing' ] == 'condition':
          operation = operation[1][ 'condition' ]
        else:
          raise Exception( 'Unknown While doing "{0}"'.format( step_data[ 'doing' ] ) )

      elif step_type == Types.IFELSE:
        item_list.append( ( step_data[ 'index' ], len( operation[1] ), 'IfElse', { 'doing': step_data[ 'doing' ] } ) )
        if step_data[ 'doing' ] == 'expression':
          operation = operation[1][ step_data[ 'index' ] ][ 'expression' ]
        elif step_data[ 'doing' ] == 'condition':
          operation = operation[1][ step_data[ 'index' ] ][ 'condition' ]
        else:
          raise Exception( 'Unknown IfElse doing "{0}"'.format( step_data[ 'doing' ] ) )

      elif step_type == Types.LINE:
        operation = operation[1]

      elif step_type == Types.FUNCTION:
        tmp = {}
        for item in ( 'dispatched', ):
          try:
            tmp[ item ] = step_data[ item ]
          except ( TypeError, KeyError ):
            pass

        for item in ( 'module', 'name' ):
          try:
            tmp[ item ] = operation[1][ item ]
          except ( TypeError, KeyError ):
            pass

        item_list.append( ( 0, 1, 'Function', tmp ) )

      elif step_type == Types.ASSIGNMENT:
        if operation[1][ 'target' ][0] == Types.ARRAY_MAP_ITEM and ( step_data is None or 'index' not in step_data ):
          operation = operation[1][ 'target' ][1][ 'index' ]
        elif step_data is None or 'value' not in step_data:
          operation = operation[1][ 'value' ]
        else:
          raise Exception( 'status - assignment confused' )

      elif step_type == Types.INFIX:
        try:
          step_data[ 'left' ]
          try:
            step_data[ 'right' ]
            raise Exception( 'Unknown Infix doing "{0}"'.format( step_data[ 'doing' ] ) )
          except KeyError:
            operation = operation[1][ 'right' ]
        except (TypeError, KeyError ):  # NOTE: TypeError occurs when there is no step data, in this case we are still after the left side
          operation = operation[1][ 'left' ]

      elif step_type in ( Types.CONSTANT, Types.VARIABLE, Types.GOTO ):
        pass
        # raise Exception( 'Not suposed to get here, interesting.' )

      else:
        raise Exception( 'Confused step type "{0}"'.format( step_type ) )

    logging.debug( 'runner: status item_list {0}'.format( item_list ) )

    result = []
    last_perc_complete = 0
    for item in reversed( item_list ):  # work backwards, as we go up, we scale the last perc_complete acording to the % of the curent scope
      # before + -> scaling the last % complete .... after the +  -> the curent %
      perc_complete = ( 1.0 / item[1] ) * last_perc_complete + ( 100.0 * item[0] ) / item[1]
      result.insert( 0, ( perc_complete, item[2], item[3] ) )
      last_perc_complete = perc_complete

    return result

  def goto( self, jump_point ):
    try:
      pos = self.jump_point_map[ jump_point ]
    except KeyError:
      raise NotDefinedError( jump_point )

    self.state = [ [ Types.SCOPE, pos ] ]

  def run( self, ttl=1000 ):
    logging.debug( 'runner: run start' )
    if self.aborted:
      return 'aborted'

    if self.done:
      return 'done'

    self.ttl = ttl

    while True:  # we are a while loop for the benifit of the goto
      try:
        self._evaluate( self.ast, 0 )
        return ''

      except Goto as e:  # yank the stack to this jump point,  NOTE: jump points can only be in the global scope
        try:
          self.goto( e.name )
        except NotDefinedError:
          self.state = 'ABORTED'
          raise NotDefinedError( e.name, e.line_no )

      except Interrupt as e:
        return str( e )

      except ( Pause, ExecutionError ) as e:
        raise e

      except ( UnrecoverableError, ParamaterError, NotDefinedError, ScriptError ) as e:
        self.state = 'ABORTED'
        raise e

      except Exception as e:
        self.state = 'ABORTED'  # TODO: watch some kind of DEBUG flag to enable/disable the stack trace
        logging.exception( 'runner: Unahndled Exception' )
        raise UnrecoverableError( 'Unahndled Exception ({0}): "{1}"\ntrace:\n{2}'.format( type( e ).__name__, str( e ), traceback.format_exc() ) )

    logging.debug( 'runner: run finish' )

  def _evaluate( self, operation, state_index ):
    logging.debug( 'runner: _evaluate level: "{0}" operation: "{1}"'.format( state_index, operation ) )
    logging.debug( 'runner: _evaluate level: "{0}" start state: "{1}"'.format( state_index, self.state ) )

    op_type = operation[0]
    op_data = operation[1]
    try:
      if self.state[ state_index ][0] != op_type:
        raise Exception( 'State type does not match AST type at {0}. Expected "{1}" got "{2}"'.format( state_index, self.state[ state_index ][0], op_type ) )
    except IndexError:
      self.state.append( [ op_type ] )

    if self.ttl <= 0:
      raise Timeout( self.cur_line )

    self.ttl -= 1

    # NOTE:
    # the logic here can seem a bit funny, however you have to keep
    # in mind that this has to be "re-entrant" ( for lack of a better word )
    # anytime you call _evaluate, execution may be aborted to take care of
    # a blocking function, so you have to check if your state has been setup
    # and sometimes it has to be set up in stages and checked as if you
    # have or haven't been through it before.
    if op_type == Types.LINE:
      self.cur_line = operation[2]
      self._evaluate( op_data, state_index + 1 )

    elif op_type == Types.SCOPE:
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( 0 )
        self.state[ state_index ].append( datetime.datetime.utcnow() )
        if 'max_time' in op_data:
          self.state[ state_index ].append( op_data[ 'max_time' ] + datetime.datetime.utcnow() )

      try:
        if self.state[ state_index ][3] is None:
          self.state[ state_index ][3] = datetime.datetime.utcnow()  # last time was a timeout, so set it so next run will timeout

        elif datetime.datetime.utcnow() > self.state[ state_index ][3]:
          self.state[ state_index ][3] = None
          raise Pause( 'Max Time Elapsed' )

      except IndexError:  # no max time
        pass

      while self.state[ state_index ][1] < len( op_data[ '_children' ] ):
        self._evaluate( op_data[ '_children' ][ self.state[ state_index ][ 1 ] ], state_index + 1 )
        self.state[ state_index ][1] += 1

    elif op_type == Types.CONSTANT:  # reterieve constant value
      try:
        self.state[ state_index ][2] = op_data
      except IndexError:
        self.state[ state_index ] += [ None, op_data ]

    elif op_type == Types.VARIABLE:  # reterieve variable value
      if op_data[ 'module' ] is None:
        try:
          value = self.variable_map[ op_data[ 'name' ] ]
        except KeyError:
          raise NotDefinedError( op_data[ 'name' ], self.cur_line )

      else:
        try:
          module = self.value_map[ op_data[ 'module' ] ]
        except KeyError:
          raise NotDefinedError( op_data[ 'module' ], self.cur_line )

        try:
          getter = module[ op_data[ 'name' ] ][0]  # index 0 is the getter
        except KeyError:
          raise NotDefinedError( '{0}" of module "{1}'.format( op_data[ 'name' ], op_data[ 'module' ] ), self.cur_line )

        if getter is None:
          raise ParamaterError( 'target', '"{0}" of module "{1}" is not gettable'.format( op_data[ 'name' ], op_data[ 'module' ] ), self.cur_line )

        try:
          value = getter()
        except Exception as e:
          _debugDump( 'getter "{0}" in module "{1}" error during setup on line "{2}"'.format( op_data[ 'name' ], op_data[ 'module' ], self.cur_line ), e, self.ast, self.state )
          raise UnrecoverableError( 'getter "{0}" in module "{1}" error during setup on line "{2}": "{3}"({4})'.format( op_data[ 'name' ], op_data[ 'module' ], self.cur_line, str( e ), e.__class__.__name__) )

      try:
        self.state[ state_index ][2] = value
      except IndexError:
        self.state[ state_index ] += [ None, value ]

    elif op_type == Types.ARRAY:  # return array
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( [] )

      for i in range( len( self.state[ state_index ][1] ), len( op_data ) ):
        try:
          self.state[ state_index + 1 ][2]
        except IndexError:
          self._evaluate( op_data[ i ], state_index + 1 )

        self.state[ state_index ][1].append( self.state[ state_index + 1 ][2] )
        self.state = self.state[ :( state_index + 1 ) ]

      self.state[ state_index ].append( self.state[ state_index ][1] )
      self.state[ state_index ][1] = None

    elif op_type == Types.MAP:  # return map
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( {} )

      for key in op_data:
        try:
          self.state[ state_index + 1 ][2]
        except IndexError:
          self._evaluate( op_data[ key ], state_index + 1 )

        self.state[ state_index ][1][ key ] = self.state[ state_index + 1 ][2]
        self.state = self.state[ :( state_index + 1 ) ]

      self.state[ state_index ].append( self.state[ state_index ][1] )
      self.state[ state_index ][1] = None

    elif op_type == Types.ARRAY_MAP_ITEM:  # reterieve array index value
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( {} )

      # evaluate the index
      try:
        self.state[ state_index ][1][ 'index' ]
      except KeyError:
        try:
          self.state[ state_index + 1 ][2]
        except IndexError:
          self._evaluate( op_data[ 'index' ], state_index + 1 )

        self.state[ state_index ][1][ 'index' ] = self.state[ state_index + 1 ][2]
        self.state = self.state[ :( state_index + 1 ) ]

      # look up the variable
      if op_data[ 'module' ] is None:
        try:
          value = self.variable_map[ op_data[ 'name' ] ]
        except KeyError:
          raise NotDefinedError( op_data[ 'name' ], self.cur_line )

      else:
        try:
          module = self.value_map[ op_data[ 'module' ] ]
        except KeyError:
          raise NotDefinedError( op_data[ 'module' ], self.cur_line )

        try:
          getter = module[ op_data[ 'name' ] ][0]  # index 0 is the getter
        except KeyError:
          raise NotDefinedError( '{0}" of "{1}'.format( op_data[ 'module' ], op_data[ 'name' ] ), self.cur_line )

        if getter is None:
          raise ParamaterError( 'target', '"{0}" of "{1}" is not gettable'.format( op_data[ 'module' ], op_data[ 'name' ] ), self.cur_line )

        try:
          value = getter()
        except Exception as e:
          _debugDump( 'getter "{0}" in module "{1}" error during setup on line "{2}"'.format( op_data[ 'name' ], op_data[ 'module' ], self.cur_line ), e, self.ast, self.state )
          raise UnrecoverableError( 'getter "{0}" in module "{1}" error during setup on line "{2}": "{3}"({4})'.format( op_data[ 'name' ], op_data[ 'module' ], self.cur_line, str( e ), e.__class__.__name__) )

      index = self.state[ state_index ][1][ 'index' ]

      try:
        value = value[ index ]
      except ( IndexError, KeyError ):
        raise NotDefinedError( 'Index/Key does not exist', self.cur_line )

      self.state[ state_index ][1] = None
      try:
        self.state[ state_index ][2] = value
      except IndexError:
        self.state[ state_index ].append( value )

    elif op_type == Types.ASSIGNMENT:  # get the value from 'value', and assign it to the variable defined in 'target'
      if op_data[ 'target' ][0] not in ( Types.VARIABLE, Types.ARRAY_MAP_ITEM ) or ( op_data[ 'target' ][0] == Types.ARRAY_MAP_ITEM and op_data[ 'target' ][1][ 'module' ] is not None ):
        raise ParamaterError( 'target', 'Can only assign to variables', self.cur_line )

      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( {} )

      if op_data[ 'target' ][0] == Types.ARRAY_MAP_ITEM:
        try:
          self.state[ state_index ][1][ 'index' ]
        except KeyError:
          try:
            self.state[ state_index + 1 ][2]
          except IndexError:
            self._evaluate( op_data[ 'target' ][1][ 'index' ], state_index + 1 )

          self.state[ state_index ][1][ 'index' ] = self.state[ state_index + 1 ][2]
          self.state = self.state[ :( state_index + 1 ) ]

      try:
        self.state[ state_index ][1][ 'value' ]
      except KeyError:
        try:
          self.state[ state_index + 1 ][2]
        except IndexError:
          self._evaluate( op_data[ 'value' ], state_index + 1 )

        self.state[ state_index ][1][ 'value' ] = self.state[ state_index + 1 ][2]
        self.state = self.state[ :( state_index + 1 ) ]

      target = op_data[ 'target' ][1]
      value = copy.deepcopy( self.state[ state_index ][1][ 'value' ] )

      if target[ 'module' ] is None:  # we don't evaluate the target, it can only be a variable
        if op_data[ 'target' ][0] == Types.ARRAY_MAP_ITEM:
          self.variable_map[ target[ 'name' ] ][ self.state[ state_index ][1][ 'index' ] ] = value
        else:
         self.variable_map[ target[ 'name' ] ] = value

      else:
        try:
          module = self.value_map[ target[ 'module' ] ]
        except KeyError:
          raise NotDefinedError( target[ 'module' ], self.cur_line )

        try:
          setter = module[ target[ 'name' ] ][1]  # index 1 is the setter
        except KeyError:
          raise NotDefinedError( '{0}" of "{1}'.format( target[ 'module' ], target[ 'name' ] ), self.cur_line )

        if setter is None:
          raise ParamaterError( 'target', '"{0}" of "{1}" is not settable'.format( target[ 'module' ], target[ 'name' ] ), self.cur_line )

        try:
          setter( value )
        except Exception as e:
          _debugDump( 'setter "{0}" in module "{1}" error on line "{2}"'.format( target[ 'name' ], target[ 'module' ], self.cur_line ), e, self.ast, self.state )
          raise UnrecoverableError( 'setter "{0}" in module "{1}" error on line "{2}": "{3}"({4})'.format( target[ 'name' ], target[ 'module' ], self.cur_line, str( e ), e.__class__.__name__) )

    elif op_type == Types.INFIX:  # infix type operators
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( {} )

      try:
        self.state[ state_index ][1][ 'left' ]
      except KeyError:
        try:
          self.state[ state_index + 1 ][2]
        except IndexError:
          self._evaluate( op_data[ 'left' ], state_index + 1 )

        self.state[ state_index ][1][ 'left' ] = self.state[ state_index + 1 ][2]
        self.state = self.state[ :( state_index + 1 ) ]

      try:
        self.state[ state_index ][1][ 'right' ]
      except KeyError:
        try:
          self.state[ state_index + 1 ][2]
        except IndexError:
          self._evaluate( op_data[ 'right' ], state_index + 1 )

        self.state[ state_index ][1][ 'right' ] = self.state[ state_index + 1 ][2]
        self.state = self.state[ :( state_index + 1 ) ]

      left_val = self.state[ state_index ][1][ 'left' ]
      right_val = self.state[ state_index ][1][ 'right' ]

      if op_data[ 'operator' ] in infix_string_operator_map:  # the string group
        if not isinstance( left_val, str ):
          left_val = str( left_val )
        if not isinstance( right_val, str ):
          right_val = str( right_val )

        value = infix_string_operator_map[ op_data[ 'operator' ] ]( left_val, right_val )

      elif op_data[ 'operator' ] in infix_math_operator_map:  # the number group
        if not isinstance( left_val, ( int, float, bool ) ):
          raise ParamaterError( 'left of operator', 'must be numeric', self.cur_line )
        if not isinstance( right_val, ( int, float, bool ) ):
          raise ParamaterError( 'right of operator', 'must be numeric', self.cur_line )

        value = infix_math_operator_map[ op_data[ 'operator' ] ]( left_val, right_val )

      elif op_data[ 'operator' ] in infix_logical_operator_map:  # the logical group
        value = infix_logical_operator_map[ op_data[ 'operator' ] ]( left_val, right_val )

      else:
        raise NotDefinedError( op_data[ 'operator' ], self.cur_line )

      self.state[ state_index ][1] = None
      self.state[ state_index ].append( value )

    elif op_type == Types.FUNCTION:  # FUNCTION
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( { 'paramaters': {} } )

      if self.state[ state_index ][1] is None:  # TODO: is there a better way to handle this?
        pass
        # function allready executed and was an Exception last time, just let things pass by us

      else:
        # get the paramaters
        for key in op_data[ 'paramaters' ]:
          try:
            self.state[ state_index ][1][ 'paramaters' ][ key ]
          except KeyError:
            try:
              self.state[ state_index + 1 ][2]
            except IndexError:
              self._evaluate( op_data[ 'paramaters' ][ key ], state_index + 1 )

            self.state[ state_index ][1][ 'paramaters' ][ key ] = self.state[ state_index + 1 ][2]
            self.state = self.state[ :( state_index + 1 ) ]

        try:
          handler = self.state[ state_index ][1][ 'handler' ]
        except KeyError:  # handler dosen't exist, let's find it and set it up
          if op_data[ 'module' ] is None:  # built in function
            try:
              handler = builtin_function_map[ op_data[ 'name' ] ]
            except KeyError:
              raise NotDefinedError( op_data[ 'name' ], self.cur_line )

            module = '<builtin>'

          else:  # external function
            try:
              module = self.function_map[ op_data[ 'module' ] ]
            except KeyError:
              raise NotDefinedError( op_data[ 'module' ], self.cur_line )

            try:
              handler = module[ op_data[ 'name' ] ]()
            except KeyError:
              raise NotDefinedError( '{0}" of "{1}'.format( op_data[ 'module' ], op_data[ 'name' ] ), self.cur_line )
            except TypeError:  # hm.... this is bad
              raise UnrecoverableError( 'Handler init function failed "{0}" on line {1}, possibly trying to call the function directly?'.format( op_data[ 'name' ], self.cur_line ) )

            module = op_data[ 'module' ]

          if isinstance( handler, tuple ):
            module = handler[0]  # yes, overlay what ever was here
            handler = handler[1]

          if isinstance( handler, ExternalFunction ):
            handler._runner = self
            try:
              handler.setup( self.state[ state_index ][1][ 'paramaters' ] )

            except ( ParamaterError, Pause, ExecutionError, UnrecoverableError, Interrupt ) as e:
              raise e

            except Exception as e:
              _debugDump( 'Handler "{0}" in module "{1}" error on line "{2}"'.format( handler.__class__.__name__, module, self.cur_line ), e, self.ast, self.state )
              raise UnrecoverableError( 'Handler "{0}" in module "{1}" error on line "{2}": "{3}"({4})'.format( handler.__class__.__name__, module, self.cur_line, str( e ), e.__class__.__name__) )

            self.contractor_cookie = str( uuid.uuid4() )
            self.state[ state_index ][1][ 'handler' ] = handler
            self.state[ state_index ][1][ 'module' ] = module
            self.state[ state_index ][1][ 'dispatched' ] = False

          else:
            try:
              paramaters = self.state[ state_index ][1][ 'paramaters' ]
            except TypeError as e:
              raise ParamaterError( '<unknown>', e, self.cur_line )

            try:
              value = handler( **paramaters )
            except ( ParamaterError, Pause, ExecutionError, UnrecoverableError, Interrupt ) as e:
              raise e

            except Exception as e:
              _debugDump( 'Handler "{0}" in module "{1}" error on line "{2}"'.format( handler.__class__.__name__, module, self.cur_line ), e, self.ast, self.state )
              raise UnrecoverableError( 'Handler "{0}" in module "{1}" error on line "{2}": "{3}"({4})'.format( handler.__class__.__name__, module, self.cur_line, str( e ), e.__class__.__name__) )

        if isinstance( handler, ExternalFunction ):  # else was allready run and set a value above
          handler._runner = self
          try:
            if not handler.done:
              handler.run()
              raise Interrupt( handler.message )

            value = handler.value

          except( Pause, ExecutionError, UnrecoverableError, Interrupt ) as e:
            raise e

          except Exception as e:
            module = op_data.get( 'module', '<builtin>' )
            _debugDump( 'Handler "{0}" in module "{1}" error during done/message/run/value on line "{2}"'.format( handler.__class__.__name__, module, self.cur_line ), e, self.ast, self.state )
            raise UnrecoverableError( 'Handler "{0}" in module "{1}" error during done/message/run/value on line "{2}": "{3}"({4})'.format( handler.__class__.__name__, module, self.cur_line, str( e ), e.__class__.__name__) )

        self.state[ state_index ][1] = None
        if isinstance( value, Exception ):
          self.state[ state_index ].append( None )
          raise value

        else:
          self.state[ state_index ].append( value )

    elif op_type == Types.WHILE:
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( { 'doing': 'condition' } )  # this is so we remember what it was we were doing when interrupted

      while True:
        if self.state[ state_index ][1][ 'doing' ] == 'condition':
          self._evaluate( op_data[ 'condition' ], state_index + 1 )
          if not self.state[ state_index + 1 ][2]:
            break

          self.state[ state_index ][1][ 'doing' ] = 'expression'
          self.state = self.state[ :( state_index + 1 ) ]

        if self.state[ state_index ][1][ 'doing' ] == 'expression':
          self._evaluate( op_data[ 'expression' ], state_index + 1 )
          self.state[ state_index ][1][ 'doing' ] = 'condition'
          self.state = self.state[ :( state_index + 1 ) ]

    elif op_type == Types.IFELSE:
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( { 'index': 0, 'doing': 'condition' } )

      while self.state[ state_index ][1][ 'index' ] < len( op_data ):
        if self.state[ state_index ][1][ 'doing' ] == 'condition':
          if op_data[ self.state[ state_index ][1][ 'index' ] ][ 'condition' ] is None:
            do_expression = True
          else:
            self._evaluate( op_data[ self.state[ state_index ][1][ 'index' ] ][ 'condition' ], state_index + 1 )
            do_expression = self.state[ state_index + 1 ][2]
            self.state = self.state[ :( state_index + 1 ) ]

          if not do_expression:
            self.state[ state_index ][1][ 'index' ] += 1
            continue

          self.state[ state_index ][1][ 'doing' ] = 'expression'

        if self.state[ state_index ][1][ 'doing' ] == 'expression':
          self._evaluate( op_data[ self.state[ state_index ][1][ 'index' ] ][ 'expression' ], state_index + 1 )
          break

        self.state = self.state[ :( state_index + 1 ) ]

    elif op_type == Types.EXISTS:
      try:
        self.state[ state_index ][1]
      except IndexError:
        self.state[ state_index ].append( None )

      try:
        self._evaluate( op_data, state_index + 1 )
        result = True
      except NotDefinedError:
        result = False

      try:
        self.state[ state_index ][2] = result
      except IndexError:
        self.state[ state_index ].append( result )

    elif op_type == Types.JUMP_POINT:  # just a NOP execution wise
      pass

    elif op_type == Types.GOTO:
      raise Goto( op_data, self.cur_line )

    else:
      raise ScriptError( 'Unimplemented "{0}"'.format( op_type ), self.cur_line )

    # if the op_type we just ran does not return a value, make sure it is cleaned up
    if op_type not in ( Types.CONSTANT, Types.VARIABLE, Types.ARRAY, Types.MAP, Types.ARRAY_MAP_ITEM, Types.INFIX, Types.FUNCTION, Types.EXISTS ):  # all the things that "return" a value
      self.state = self.state[ :state_index ]  # remove this an evertying after from the state
    else:
      self.state = self.state[ :state_index + 1 ]  # remove everything after this one, save this one's return value on the stack

    logging.debug( 'runner: _evaluate level: "{0}" final state: {1}'.format( state_index, self.state ) )
    if self.state == []:
      self.state = 'DONE'
      self.cur_line = None

  def toSubcontractor( self, subcontractor_module_list ):
    # return None if we done, or not started
    if self.done or self.aborted or self.state == []:
      return None

    operation = self.state[ -1 ]

    if operation[0] != Types.FUNCTION and operation[0]:  # not a function
      return None

    if operation[1] is None:  # the operation isn't setup yet
      return None

    try:
      if operation[1][ 'module' ] not in subcontractor_module_list:
        return None
    except KeyError:
      return None  # function is not external

    if operation[1][ 'dispatched' ] is True:  # allready dispatchced, don't send anything else until something comes back
      return None

    handler = operation[1][ 'handler' ]
    handler._runner = self
    try:
      paramaters = handler.toSubcontractor()
    except Exception as e:
      _debugDump( 'Handler "{0}" in module "{1}" error during toSubcontractor on line "{2}"'.format( handler.__class__.__name__, operation[1][ 'module' ], self.cur_line ), e, self.ast, self.state )
      return None  # TODO: log something?

    if paramaters is None:
      return None

    operation[1][ 'dispatched' ] = True

    return { 'module': operation[1][ 'module' ], 'function': paramaters[0], 'cookie': self.contractor_cookie, 'paramaters': paramaters[1] }

  def fromSubcontractor( self, cookie, data ):
    if self.done or self.aborted or self.state == []:
      return ( 'Script not Running', None )

    if cookie != self.contractor_cookie:
      return ( 'Bad Cookie', None )

    operation = self.state[ -1 ]

    if operation[0] != Types.FUNCTION:
      return ( 'Not At a Function', None )

    if operation[1][ 'dispatched' ] is False:
      return ( 'Not Expecting Anything', None )

    handler = operation[1][ 'handler' ]
    handler._runner = self
    try:
      handler.fromSubcontractor( data )
    except Exception as e:
      _debugDump( 'Handler "{0}" in module "{1}" error during fromSubcontractor on line "{2}"'.format( handler.__class__.__name__, operation[1][ 'module' ], self.cur_line ), e, self.ast, self.state )
      return ( 'Error', None )  # TODO: log something?

    operation[1][ 'dispatched' ] = False

    return ( 'Accepted', handler.message )

  def clearDispatched( self ):
    if self.done or self.aborted or self.state == []:
      return

    operation = self.state[ -1 ]

    if operation[0] != Types.FUNCTION:
      return

    if not isinstance( operation[1], dict ) or 'dispatched' not in operation[1]:
      return  # or?: raise Exception( 'Function is not dispatched or has allready returned its value' ), we don't say anything if it's not a function

    operation[1][ 'dispatched' ] = False

    return

  def rollback( self ):  # TODO: make to/from subcontractor and  rollback consistant in how they handle errors, this will take some work with the things calling them
    if self.done or self.aborted or self.state == []:
      return 'Script not Running'

    operation = self.state[ -1 ]

    if operation[0] != Types.FUNCTION:
      return 'Not At a Function'

    handler = operation[1][ 'handler' ]
    try:
      handler.rollback()

    except NoRollback:
      return 'Rollback not possible'

    except Exception as e:
      _debugDump( 'Handler "{0}" in module "{1}" error starting rollback on line "{2}"'.format( handler.__class__.__name__, operation[1][ 'module' ], self.cur_line ), e, self.ast, self.state )
      return 'Exception while trying to rollback'  # TODO: log?

    self.contractor_cookie = str( uuid.uuid4() )  # revoke any outstanding tasks, TODO: do we also rotate cookie on reset?  if not, should we rotate keys even if rollback is  not possible
    operation[1][ 'dispatched' ] = False

    return 'Done'

  def registerModule( self, name ):
    module = import_module( name )

    self.function_map[ module.TSCRIPT_NAME ] = module.TSCRIPT_FUNCTIONS
    self.value_map[ module.TSCRIPT_NAME ] = module.TSCRIPT_VALUES

    self.module_list.append( name )

  def registerObject( self, obj ):  # all objects must be serializable, if not use the module, thoes are not serilized into the stored pickle, just the names so they can be auto-registered when unpickled
    name = obj.TSCRIPT_NAME

    self.function_map[ name ] = obj.getFunctions()
    self.value_map[ name ] = obj.getValues()

    self.object_list.append( obj )

  def getValue( self, module, name ):
    try:
      module = self.value_map[ module ]
    except KeyError:
      raise NotDefinedError( module )

    try:
      getter = module[ name ][0]  # index 0 is the getter
    except KeyError:
      raise NotDefinedError( name )

    if getter is None:
      raise ParamaterError( 'target', '"{0}" of "{1}" is not gettable'.format( module, name ) )

    return getter()

  def __reduce__( self ):
    return ( self.__class__, ( self.ast, ), self.__getstate__() )

  def __getstate__( self ):
    return { 'module_list': self.module_list, 'object_list': self.object_list, 'state': self.state, 'variable_map': self.variable_map, 'cur_line': self.cur_line, 'contractor_cookie': self.contractor_cookie }

  def __setstate__( self, state ):
    self.state = state[ 'state' ]
    self.variable_map = state[ 'variable_map' ]
    self.cur_line = state[ 'cur_line' ]
    self.contractor_cookie = state[ 'contractor_cookie' ]
    for module in state[ 'module_list' ]:
      self.registerModule( module )

    for obj in state[ 'object_list' ]:
      self.registerObject( obj )
