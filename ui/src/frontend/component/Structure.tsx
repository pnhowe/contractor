import React from 'react';
import { connect } from 'react-redux';
import ConfigDialog from './ConfigDialog';
import { contractor } from '../store';
import { fetchStructureList, fetchStructure } from '../store/structuresSlice';
import type { StructureListItem, StructureDetail } from '../store/structuresSlice';
import { Alert, Box, Chip, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr, configValues, stateColor } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: StructureListItem[] | null;
  detail: StructureDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class Structure extends React.Component<Props>
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
      props.dispatch( fetchStructure( props.id ) );
    }
    else
    {
      props.dispatch( fetchStructureList( props.site ) );
    }
  }

  renderDetail( detail: StructureDetail )
  {
    const { structure: s, addresses } = detail;
    return (
      <Box>
        <ConfigDialog getConfig={ () => contractor.Building_Structure_call_getConfig( parseInt( this.props.id! ) ) } />
        <Table size="small" sx={{ mt: 1 }}>
          <TableBody>
            <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + s.site?.toString() }>{ s.site?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Foundation</TableCell><TableCell><Link component={ RouterLink } to={ '/foundation/' + s.foundation?.toString() }>{ s.foundation?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Hostname</TableCell><TableCell>{ s.hostname }</TableCell></TableRow>
            <TableRow><TableCell variant="head">State</TableCell><TableCell>{ s.state }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Blueprint</TableCell><TableCell><Link component={ RouterLink } to={ '/blueprint/s/' + s.blueprint?.toString() }>{ s.blueprint?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Config UUID</TableCell><TableCell>{ s.config_uuid }</TableCell></TableRow>
            <TableRow>
              <TableCell variant="head">Config Values</TableCell>
              <TableCell>
                <Table size="small">
                  <TableBody>
                    { configValues( s.config_values ).map( ( item, index ) => (
                      <TableRow key={ index }>
                        <TableCell variant="head">{ item[0] }</TableCell>
                        <TableCell>{ item[1] }</TableCell>
                      </TableRow>
                    ) ) }
                  </TableBody>
                </Table>
              </TableCell>
            </TableRow>
            <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( s.created ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( s.updated ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Built At</TableCell><TableCell>{ dateStr( s.built_at ) }</TableCell></TableRow>
          </TableBody>
        </Table>
        <Typography variant="h6" sx={{ mt: 2 }}>IP Addresses</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Offset</TableCell>
              <TableCell>Ip Address</TableCell>
              <TableCell>Interface</TableCell>
              <TableCell>Address Block</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( addresses || [] ).map( ( addr ) => (
              <TableRow key={ addr.id }>
                <TableCell>{ addr.offset }</TableCell>
                <TableCell>{ addr.ip_address }</TableCell>
                <TableCell>{ addr.interface_name }</TableCell>
                <TableCell><Link component={ RouterLink } to={ '/addressblock/' + addr.address_block?.toString() }>{ addr.address_block?.toString() }</Link></TableCell>
                <TableCell>{ dateStr( addr.created ) }</TableCell>
                <TableCell>{ dateStr( addr.updated ) }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
      </Box>
    );
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      return (
        <Box>
          <Link component={ RouterLink } to="/structures">&larr; Structures</Link>
          <Typography variant="h5" gutterBottom>Structure Detail</Typography>
          { this.props.detail !== null && this.renderDetail( this.props.detail! ) }
        </Box>
      );
    }

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="right">Id</TableCell>
            <TableCell>Hostname</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/structure/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.hostname }</TableCell>
              <TableCell><Chip size="small" label={ item.state } color={ stateColor( item.state ) } /></TableCell>
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
  list: state.structures.list,
  detail: state.structures.detail,
  authenticated: state.app.authenticated,
  loading: state.structures.loading,
  error: state.structures.error,
} );

export default connect( mapStateToProps )( Structure );
