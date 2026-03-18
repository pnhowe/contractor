import React from 'react';
import { connect } from 'react-redux';
import { fetchComplexList, fetchComplex } from '../store/complexesSlice';
import type { ComplexListItem, ComplexDetail } from '../store/complexesSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: ComplexListItem[] | null;
  detail: ComplexDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class Complex extends React.Component<Props>
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
      props.dispatch( fetchComplex( props.id ) );
    }
    else
    {
      props.dispatch( fetchComplexList( props.site ) );
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      var complex = this.props.detail;
      return (
        <Box>
          <Link component={ RouterLink } to="/complexes">&larr; Complexes</Link>
          <Typography variant="h5" gutterBottom>Complex Detail</Typography>
          { complex !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + complex.site?.toString() }>{ complex.site?.toString() }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ complex.description }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ complex.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">State</TableCell><TableCell>{ complex.state }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Type</TableCell><TableCell>{ complex.type }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Members</TableCell><TableCell><ul>{ ( complex.members || [] ).map( ( item, index ) => (
                  <li key={ index }>{ item.toString() }</li>
                ) ) }</ul></TableCell></TableRow>
                <TableRow><TableCell variant="head">Built at Percentage</TableCell><TableCell>{ complex.built_percentage }%</TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( complex.created ) }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( complex.updated ) }</TableCell></TableRow>
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
            <TableCell>Description</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/complex/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.description }</TableCell>
              <TableCell>{ item.type }</TableCell>
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
  list: state.complexes.list,
  detail: state.complexes.detail,
  authenticated: state.app.authenticated,
  loading: state.complexes.loading,
  error: state.complexes.error,
} );

export default connect( mapStateToProps )( Complex );
