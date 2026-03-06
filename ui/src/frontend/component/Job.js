import React from 'react';
import CInP from './cinp';
import JobStateDialog from './JobStateDialog';
import { Box, Button, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Job extends React.Component
{
  state = {
      jobF_list: [],
      jobS_list: [],
      jobD_list: [],
      job: null,
      jobURI: null,
      canPause: false,
      canResume: false,
      canReset: false,
      canRollback: false
  };

  resume = () =>
  {
    this.props.contractor.resumeJob( this.state.jobURI )
      .then( () =>
      {
        this.update( this.props );
        alert( 'Job Resumed' );
      }, ( error ) => alert( 'Error Resuming job: "' + error.reason + '": "' + error.detail + '"' ) );
  };

  pause = () =>
  {
    this.props.contractor.pauseJob( this.state.jobURI )
      .then( () =>
      {
        this.update( this.props );
        alert( 'Job Paused' );
      }, ( error ) => alert( 'Error Pausing job: "' + error.reason + '": "' + error.detail + '"' ) );
  };

  reset = () =>
  {
    this.props.contractor.resetJob( this.state.jobURI )
      .then( () =>
      {
        this.update( this.props );
        alert( 'Job Reset' );
      }, ( error ) => alert( 'Error Resetting job: "' + error.reason + '": "' + error.detail + '"' ) );
  };

  rollback = () =>
  {
    this.props.contractor.rollbackJob( this.state.jobURI )
      .then( () =>
      {
        this.update( this.props );
        alert( 'Job Rollback' );
      }, ( error ) => alert( 'Error Rolling Back job: "' + error.reason + '": "' + error.detail + '"' ) );
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { jobF_list: [], jobS_list: [], job: null } );
      this.update( this.props );
    }
  }

  update( props )
  {
    if( props.id !== undefined )
    {
      var uri = null;
      if( props.jobType == 'foundation' )
      {
        uri = '/api/v1/Foreman/FoundationJob:' + props.id + ':';
      }
      if( props.jobType == 'structure' )
      {
        uri = '/api/v1/Foreman/StructureJob:' + props.id + ':';
      }
      if( props.jobType == 'dependency' )
      {
        uri = '/api/v1/Foreman/DependencyJob:' + props.id + ':';
      }
      if( uri === null )
      {
        console.log( 'Unknown Job type "' + props.jobType + '"' );
        return
      }

      props.contractor.cinp.get( uri )
       .then( ( result ) =>
        {
          var data = result.data;
          data.site = CInP.extractIds( data.site )[0];
          if ( data.foundation !== undefined )
          {
            data.foundation = CInP.extractIds( data.foundation )[0];
          }
          if ( data.structure !== undefined )
          {
            data.structure = CInP.extractIds( data.structure )[0];
          }
          if ( data.dependency !== undefined )
          {
            data.dependency = CInP.extractIds( data.dependency )[0];
          }

          var canPause = false;
          var canResume = false;
          var canReset = false;
          var canRollback = false;
          if( data.state == 'paused' )
          {
            canResume = true;
          }
          else if( data.state == 'queued' )
          {
            canPause = true;
          }
          else if( data.state == 'error' )
          {
            canReset = true;
            canRollback = true;
          }

          this.setState( { job: data, jobURI: uri, canPause: canPause, canResume: canResume, canReset: canReset, canRollback: canRollback } );
        } );
    }
    else
    {
      props.listGetS( props.site )
        .then( ( result ) =>
        {
          var job_list = [];
          for ( var id in result.data )
          {
            var job = result.data[ id ];
            id = CInP.extractIds( id )[0];
            job_list.push( { id: id,
                             script: job.script_name,
                             structure: CInP.extractIds( job.structure )[0],
                             message: job.message,
                             progress: job.progress,
                             state: job.state,
                             status: JSON.parse( job.status.replaceAll( "'", "\"" ).replaceAll( "False", "false" ).replaceAll( "True", "true" ).replaceAll( "None", "null" ) ),
                             created: job.created,
                             updated: job.updated,
                            } );
          }

          this.setState( { jobS_list: job_list } );
        } );
      props.listGetF( props.site )
        .then( ( result ) =>
        {
          var job_list = [];
          for ( var id in result.data )
          {
            var job = result.data[ id ];
            id = CInP.extractIds( id )[0];
            job_list.push( { id: id,
                             script: job.script_name,
                             foundation: CInP.extractIds( job.foundation )[0],
                             message: job.message,
                             progress: job.progress,
                             state: job.state,
                             status: JSON.parse( job.status.replaceAll( "'", "\"" ).replaceAll( "False", "false" ).replaceAll( "True", "true" ).replaceAll( "None", "null" ) ),
                             created: job.created,
                             updated: job.updated,
                            } );
          }

          this.setState( { jobF_list: job_list } );
        } );
      props.listGetD( props.site )
        .then( ( result ) =>
        {
          var job_list = [];
          for ( var id in result.data )
          {
            var job = result.data[ id ];
            id = CInP.extractIds( id )[0];
            job_list.push( { id: id,
                             script: job.script_name,
                             dependency: CInP.extractIds( job.dependency )[0],
                             message: job.message,
                             progress: job.progress,
                             status: JSON.parse( job.status.replaceAll( "'", "\"" ).replaceAll( "False", "false" ).replaceAll( "True", "true" ).replaceAll( "None", "null" ) ),
                             state: job.state,
                             created: job.created,
                             updated: job.updated,
                            } );
          }

          this.setState( { jobD_list: job_list } );
        } );
    }
  }

  render_status( item )
  {
    if ( item[1] == 'Function' && item[2].dispatched )
      return <Box key={ item[0] }><strong>Task Dispatched</strong></Box>

    if ( item[1] == 'Scope' )
    {
      if ( item[2] === null )
        return <Box key={ item[0] }>{ item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }%</Box>

      if ( item[2].time_remaining )
      {
        if( item[2].time_remaining[0] == '-' )
          return <Box key={ item[0] } sx={{ backgroundColor: '#ffa' }}><strong>{ item[2].description }</strong> { item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }% Elapsed:&nbsp;{ item[2].time_elapsed } Remaning:&nbsp;{ item[2].time_remaining }</Box>

        return <Box key={ item[0] }><strong>{ item[2].description }</strong> { item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }% Elapsed:&nbsp;{ item[2].time_elapsed } Remaning:&nbsp;{ item[2].time_remaining }</Box>
      }

      return <Box key={ item[0] }><strong>{ item[2].description }</strong> { item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }%  Elapsed:&nbsp;{ item[2].time_elapsed }</Box>
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var job = this.state.job;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Job Detail</Typography>
          { job !== null &&
            <Box>
              <Box sx={{ mb: 1 }}>
                <Button onClick={ this.pause } disabled={ !this.state.canPause }>Pause</Button>
                <Button onClick={ this.resume } disabled={ !this.state.canResume }>Resume</Button>
                <Button onClick={ this.reset } disabled={ !this.state.canReset }>Reset</Button>
                <Button onClick={ this.rollback } disabled={ !this.state.canRollback }>Rollback</Button>
                <JobStateDialog getState={ this.props.contractor.getJobState } uri={ this.state.jobURI } />
              </Box>
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + job.site }>{ job.site }</Link></TableCell></TableRow>
                  { job.foundation !== undefined &&
                    <TableRow><TableCell variant="head">Foundation</TableCell><TableCell><Link component={ RouterLink } to={ '/foundation/' + job.foundation }>{ job.foundation }</Link></TableCell></TableRow>
                  }
                  { job.structure !== undefined &&
                    <TableRow><TableCell variant="head">Structure</TableCell><TableCell><Link component={ RouterLink } to={ '/structure/' + job.structure }>{ job.structure }</Link></TableCell></TableRow>
                  }
                  <TableRow><TableCell variant="head">Script</TableCell><TableCell>{ job.script_name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Message</TableCell><TableCell>{ job.message }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Progress</TableCell><TableCell>{ job.progress }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">State</TableCell><TableCell>{ job.state }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ job.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ job.updated }</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
          }
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h5" gutterBottom>Foundation Jobs</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">Id</TableCell>
              <TableCell>Script</TableCell>
              <TableCell>Foundation</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Dates</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { this.state.jobF_list.map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/job/f/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.script }</TableCell>
                <TableCell><Link component={ RouterLink } to={ '/foundation/' + item.foundation }>{ item.foundation }</Link></TableCell>
                <TableCell>{ item.message }<br/>{ item.status.map( this.render_status ) }</TableCell>
                <TableCell>{ item.state }</TableCell>
                <TableCell><strong>Created:</strong>&nbsp;{ item.created }<br/><strong>Updated:</strong>&nbsp;{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Structure Jobs</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">Id</TableCell>
              <TableCell>Script</TableCell>
              <TableCell>Structure</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Dates</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { this.state.jobS_list.map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/job/s/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.script }</TableCell>
                <TableCell><Link component={ RouterLink } to={ '/structure/' + item.structure }>{ item.structure }</Link></TableCell>
                <TableCell>{ item.message }<br/>{ item.status.map( this.render_status ) }</TableCell>
                <TableCell>{ item.state }</TableCell>
                <TableCell><strong>Created:</strong>&nbsp;{ item.created }<br/><strong>Updated:</strong>&nbsp;{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Dependency Jobs</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">Id</TableCell>
              <TableCell>Script</TableCell>
              <TableCell>Dependency</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Dates</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { this.state.jobD_list.map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/job/d/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.script }</TableCell>
                <TableCell>{ item.dependency }</TableCell>
                <TableCell>{ item.message }<br/>{ item.status.map( this.render_status ) }</TableCell>
                <TableCell>{ item.state }</TableCell>
                <TableCell><strong>Created:</strong>&nbsp;{ item.created }<br/><strong>Updated:</strong>&nbsp;{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
      </Box>
    );

  }
};

export default Job;
