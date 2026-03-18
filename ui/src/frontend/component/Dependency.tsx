import React from 'react';
import { connect } from 'react-redux';
import { fetchDependencyList, fetchDependency } from '../store/dependenciesSlice';
import type { DependencyListItem, DependencyDetail } from '../store/dependenciesSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: DependencyListItem[] | null;
  detail: DependencyDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class Dependency extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.id !== this.props.id ||
         prevProps.site !== this.props.site ||
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
      props.dispatch( fetchDependency( props.id ) );
    }
    else
    {
      props.dispatch( fetchDependencyList( props.site ) );
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      var dependency = this.props.detail;
      return (
        <Box>
          <Link component={ RouterLink } to="/dependancies">&larr; Dependencies</Link>
          <Typography variant="h5" gutterBottom>Dependency Detail</Typography>
          { dependency !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Structure</TableCell><TableCell><Link component={ RouterLink } to={ '/structure/' + dependency.structure?.toString() }>{ dependency.structure?.toString() }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Dependency</TableCell><TableCell><Link component={ RouterLink } to={ '/dependency/' + dependency.dependency?.toString() }>{ dependency.dependency?.toString() }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Foundation</TableCell><TableCell><Link component={ RouterLink } to={ '/foundation/' + dependency.foundation?.toString() }>{ dependency.foundation?.toString() }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Script Structure</TableCell><TableCell><Link component={ RouterLink } to={ '/structure/' + dependency.script_structure?.toString() }>{ dependency.script_structure?.toString() }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Create Script Name</TableCell><TableCell>{ dependency.create_script_name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Destroy Script Name</TableCell><TableCell>{ dependency.destroy_script_name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">State</TableCell><TableCell>{ dependency.state }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Link</TableCell><TableCell>{ dependency.link }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( dependency.created ) }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( dependency.updated ) }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Built At</TableCell><TableCell>{ dateStr( dependency.built_at ) }</TableCell></TableRow>
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
            <TableCell align="right">Id</TableCell>
            <TableCell>Foundation</TableCell>
            <TableCell>Structure</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/dependency/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.foundation }</TableCell>
              <TableCell>{ item.structure }</TableCell>
              <TableCell>{ item.state }</TableCell>
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
  list: state.dependencies.list,
  detail: state.dependencies.detail,
  authenticated: state.app.authenticated,
  loading: state.dependencies.loading,
  error: state.dependencies.error,
} );

export default connect( mapStateToProps )( Dependency );
