import React from 'react';
import { connect } from 'react-redux';
import { fetchCartographerList } from '../store/cartographerSlice';
import type { CartographerItem } from '../store/cartographerSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';

interface StateProps {
  list: CartographerItem[] | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = StateProps & { dispatch: AppDispatch };

class Cartographer extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.list !== null && this.props.list === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    props.dispatch( fetchCartographerList() );
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Identifier</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Foundation</TableCell>
            <TableCell>Last Checkin</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id } >
              <TableCell>{ item.identifier }</TableCell>
              <TableCell>{ item.message }</TableCell>
              <TableCell><Link component={ RouterLink } to={ '/plot/' + item.foundation }>{ item.foundation }</Link></TableCell>
              <TableCell>{ item.last_checkin }</TableCell>
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
  list: state.cartographer.list,
  authenticated: state.app.authenticated,
  loading: state.cartographer.loading,
  error: state.cartographer.error,
} );

export default connect( mapStateToProps )( Cartographer );
