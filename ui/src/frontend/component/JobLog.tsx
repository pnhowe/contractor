import React from 'react';
import { connect } from 'react-redux';
import { fetchJobLogList } from '../store/jobLogSlice';
import type { JobLogItem } from '../store/jobLogSlice';
import { Alert, Box, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { RootState, AppDispatch } from '../store';

interface OwnProps {
  site?: string;
}

interface StateProps {
  list: JobLogItem[] | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class JobLog extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.site !== this.props.site ||
         ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.list !== null && this.props.list === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    props.dispatch( fetchJobLogList( props.site ) );
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Job Id</TableCell>
            <TableCell>Site</TableCell>
            <TableCell>Target Class</TableCell>
            <TableCell>Target Description</TableCell>
            <TableCell>Script Name</TableCell>
            <TableCell>Creator</TableCell>
            <TableCell>Started At</TableCell>
            <TableCell>Finished At</TableCell>
            <TableCell>Canceled By</TableCell>
            <TableCell>Canceled At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id } >
              <TableCell>{ item.job_id }</TableCell>
              <TableCell>{ item.site }</TableCell>
              <TableCell>{ item.target_class }</TableCell>
              <TableCell>{ item.target_description }</TableCell>
              <TableCell>{ item.script_name }</TableCell>
              <TableCell>{ item.creator }</TableCell>
              <TableCell>{ item.started_at }</TableCell>
              <TableCell>{ item.finished_at }</TableCell>
              <TableCell>{ item.canceled_by }</TableCell>
              <TableCell>{ item.canceled_at }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

const mapStateToProps = ( state: RootState ) => ( {
  list: state.jobLog.list,
  authenticated: state.app.authenticated,
  loading: state.jobLog.loading,
  error: state.jobLog.error,
} );

export default connect( mapStateToProps )( JobLog );
