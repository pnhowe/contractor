import React from 'react';
import { connect } from 'react-redux';
import { fetchPXEList, fetchPXE } from '../store/pxeSlice';
import type { PXEListItem, PXEDetail } from '../store/pxeSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: PXEListItem[] | null;
  detail: PXEDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class PXE extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.id !== this.props.id ||
         ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.list !== null && this.props.list === null ) ||
         ( prevProps.detail !== null && this.props.detail === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    if( props.id !== undefined )
    {
      props.dispatch( fetchPXE( props.id ) );
    }
    else
    {
      props.dispatch( fetchPXEList() );
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      var pxe = this.props.detail;
      return (
        <Box>
          <Link component={ RouterLink } to="/pxes">&larr; PXEs</Link>
          <Typography variant="h5" gutterBottom>PXE Detail</Typography>
          { pxe !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ pxe.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Boot Script</TableCell><TableCell><pre>{ pxe.boot_script }</pre></TableCell></TableRow>
                <TableRow><TableCell variant="head">Template</TableCell><TableCell><pre>{ pxe.template }</pre></TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( pxe.created ) }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( pxe.updated ) }</TableCell></TableRow>
              </TableBody>
            </Table>
          }
        </Box>
      );
    }

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.name } >
              <TableCell><Link component={ RouterLink } to={ '/pxe/' + item.name }>{ item.name }</Link></TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

const mapStateToProps = ( state: RootState ) => ( {
  list: state.pxe.list,
  detail: state.pxe.detail,
  authenticated: state.app.authenticated,
  loading: state.pxe.loading,
  error: state.pxe.error,
} );

export default connect( mapStateToProps )( PXE );
