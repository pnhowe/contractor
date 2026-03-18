import React from 'react';
import { connect } from 'react-redux';
import { contractor } from '../store';
import { fetchFoundationJobList, fetchStructureJobList, fetchDependencyJobList, fetchJobDetail, pauseJob, resumeJob, resetJob, rollbackJob } from '../store/jobsSlice';
import type { JobListItem, JobDetail } from '../store/jobsSlice';
import JobStateDialog from './JobStateDialog';
import { Alert, Box, Button, Chip, CircularProgress, Link, Snackbar, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr, stateColor } from '../lib/utils';

interface OwnProps {
  id?: string;
  jobType?: string;
  site?: string;
}

interface StateProps {
  listFoundation: JobListItem[] | null;
  listStructure: JobListItem[] | null;
  listDependency: JobListItem[] | null;
  detail: JobDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

interface JobLocalState {
  snackMessage: string;
  snackSeverity: 'success' | 'error';
  snackOpen: boolean;
}

class Job extends React.Component<Props, JobLocalState>
{
  state: JobLocalState = { snackMessage: '', snackSeverity: 'success', snackOpen: false };

  showSnack = ( message: string, severity: 'success' | 'error' ) =>
  {
    this.setState( { snackMessage: message, snackSeverity: severity, snackOpen: true } );
  };

  resume = () =>
  {
    this.props.dispatch( resumeJob( this.props.detail!.jobURI ) )
      .unwrap()
      .then( () =>
      {
        this.props.dispatch( fetchJobDetail( { id: this.props.id!, jobType: this.props.jobType! } ) );
        this.showSnack( 'Job Resumed', 'success' );
      } )
      .catch( ( error: any ) => this.showSnack( 'Error Resuming job: "' + error.message + '"', 'error' ) );
  };

  pause = () =>
  {
    this.props.dispatch( pauseJob( this.props.detail!.jobURI ) )
      .unwrap()
      .then( () =>
      {
        this.props.dispatch( fetchJobDetail( { id: this.props.id!, jobType: this.props.jobType! } ) );
        this.showSnack( 'Job Paused', 'success' );
      } )
      .catch( ( error: any ) => this.showSnack( 'Error Pausing job: "' + error.message + '"', 'error' ) );
  };

  reset = () =>
  {
    this.props.dispatch( resetJob( this.props.detail!.jobURI ) )
      .unwrap()
      .then( () =>
      {
        this.props.dispatch( fetchJobDetail( { id: this.props.id!, jobType: this.props.jobType! } ) );
        this.showSnack( 'Job Reset', 'success' );
      } )
      .catch( ( error: any ) => this.showSnack( 'Error Resetting job: "' + error.message + '"', 'error' ) );
  };

  rollback = () =>
  {
    this.props.dispatch( rollbackJob( this.props.detail!.jobURI ) )
      .unwrap()
      .then( () =>
      {
        this.props.dispatch( fetchJobDetail( { id: this.props.id!, jobType: this.props.jobType! } ) );
        this.showSnack( 'Job Rollback', 'success' );
      } )
      .catch( ( error: any ) => this.showSnack( 'Error Rolling Back job: "' + error.message + '"', 'error' ) );
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.id !== this.props.id ||
         prevProps.site !== this.props.site ||
         ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.listFoundation !== null && this.props.listFoundation === null ) ||
         ( prevProps.listStructure !== null && this.props.listStructure === null ) ||
         ( prevProps.listDependency !== null && this.props.listDependency === null ) ||
         ( prevProps.detail !== null && this.props.detail === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    if( props.id !== undefined )
    {
      props.dispatch( fetchJobDetail( { id: props.id, jobType: props.jobType! } ) );
    }
    else
    {
      props.dispatch( fetchFoundationJobList( props.site ) );
      props.dispatch( fetchStructureJobList( props.site ) );
      props.dispatch( fetchDependencyJobList( props.site ) );
    }
  }

  render_status( item: any, idx: number )
  {
    if ( item[1] == 'Function' && item[2].dispatched )
      return <Box key={ idx }><strong>Task Dispatched</strong></Box>

    if ( item[1] == 'Scope' )
    {
      if ( item[2] === null )
        return <Box key={ idx }>{ item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }%</Box>

      if ( item[2].time_remaining )
      {
        if( item[2].time_remaining[0] == '-' )
          return <Box key={ idx } sx={{ bgcolor: 'orange' }}><strong>{ item[2].description }</strong> { item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }% Elapsed:&nbsp;{ item[2].time_elapsed } Remaning:&nbsp;{ item[2].time_remaining }</Box>

        return <Box key={ idx }><strong>{ item[2].description }</strong> { item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }% Elapsed:&nbsp;{ item[2].time_elapsed } Remaning:&nbsp;{ item[2].time_remaining }</Box>
      }

      return <Box key={ idx }><strong>{ item[2].description }</strong> { item[0].toLocaleString( undefined, { minimumFractionDigits:2 } ) }%  Elapsed:&nbsp;{ item[2].time_elapsed }</Box>
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    const snackbar = (
      <Snackbar open={ this.state.snackOpen } autoHideDuration={ 4000 } onClose={ () => this.setState( { snackOpen: false } ) }>
        <Alert severity={ this.state.snackSeverity } onClose={ () => this.setState( { snackOpen: false } ) }>{ this.state.snackMessage }</Alert>
      </Snackbar>
    );
    if( this.props.id !== undefined )
    {
      var jobDetail = this.props.detail;
      return (
        <Box>
          <Link component={ RouterLink } to="/jobs">&larr; Jobs</Link>
          <Typography variant="h5" gutterBottom>Job Detail</Typography>
          { jobDetail !== null &&
            <Box>
              <Box sx={{ mb: 1 }}>
                <Button onClick={ this.pause } disabled={ !jobDetail.canPause }>Pause</Button>
                <Button onClick={ this.resume } disabled={ !jobDetail.canResume }>Resume</Button>
                <Button onClick={ this.reset } disabled={ !jobDetail.canReset }>Reset</Button>
                <Button onClick={ this.rollback } disabled={ !jobDetail.canRollback }>Rollback</Button>
                <JobStateDialog getState={ ( uri: string ) => { const id = parseInt( uri.split( ':' )[ 1 ] ); return Promise.all( [ contractor.Foreman_BaseJob_call_jobRunnerVariables( id ), contractor.Foreman_BaseJob_call_jobRunnerState( id ) ] ); } } uri={ jobDetail.jobURI } />
              </Box>
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + ( jobDetail.job as any ).site?.toString() }>{ ( jobDetail.job as any ).site?.toString() }</Link></TableCell></TableRow>
                  { ( jobDetail.job as any ).foundation !== undefined &&
                    <TableRow><TableCell variant="head">Foundation</TableCell><TableCell><Link component={ RouterLink } to={ '/foundation/' + ( jobDetail.job as any ).foundation?.toString() }>{ ( jobDetail.job as any ).foundation?.toString() }</Link></TableCell></TableRow>
                  }
                  { ( jobDetail.job as any ).structure !== undefined &&
                    <TableRow><TableCell variant="head">Structure</TableCell><TableCell><Link component={ RouterLink } to={ '/structure/' + ( jobDetail.job as any ).structure?.toString() }>{ ( jobDetail.job as any ).structure?.toString() }</Link></TableCell></TableRow>
                  }
                  <TableRow><TableCell variant="head">Script</TableCell><TableCell>{ jobDetail.job.script_name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Message</TableCell><TableCell>{ jobDetail.job.message }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">State</TableCell><TableCell>{ jobDetail.job.state }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( jobDetail.job.created ) }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( jobDetail.job.updated ) }</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
          }
          { snackbar }
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
            { ( this.props.listFoundation || [] ).map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/job/f/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.script }</TableCell>
                <TableCell><Link component={ RouterLink } to={ '/foundation/' + item.foundation }>{ item.foundation }</Link></TableCell>
                <TableCell>{ item.message }<br/>{ item.status.map( ( s: any, idx: number ) => this.render_status( s, idx ) ) }</TableCell>
                <TableCell><Chip size="small" label={ item.state } color={ stateColor( item.state ) } /></TableCell>
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
            { ( this.props.listStructure || [] ).map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/job/s/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.script }</TableCell>
                <TableCell><Link component={ RouterLink } to={ '/structure/' + item.structure }>{ item.structure }</Link></TableCell>
                <TableCell>{ item.message }<br/>{ item.status.map( ( s: any, idx: number ) => this.render_status( s, idx ) ) }</TableCell>
                <TableCell><Chip size="small" label={ item.state } color={ stateColor( item.state ) } /></TableCell>
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
            { ( this.props.listDependency || [] ).map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/job/d/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.script }</TableCell>
                <TableCell>{ item.dependency }</TableCell>
                <TableCell>{ item.message }<br/>{ item.status.map( ( s: any, idx: number ) => this.render_status( s, idx ) ) }</TableCell>
                <TableCell><Chip size="small" label={ item.state } color={ stateColor( item.state ) } /></TableCell>
                <TableCell><strong>Created:</strong>&nbsp;{ item.created }<br/><strong>Updated:</strong>&nbsp;{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
        { snackbar }
      </Box>
    );

  }
};

const mapStateToProps = ( state: RootState ) => ( {
  listFoundation: state.jobs.listFoundation,
  listStructure: state.jobs.listStructure,
  listDependency: state.jobs.listDependency,
  detail: state.jobs.detail,
  authenticated: state.app.authenticated,
  loading: state.jobs.loading,
  error: state.jobs.error,
} );

export default connect( mapStateToProps )( Job );
