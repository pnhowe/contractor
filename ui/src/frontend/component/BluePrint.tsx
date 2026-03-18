import React from 'react';
import { connect } from 'react-redux';
import ConfigDialog from './ConfigDialog';
import ScriptDialog from './ScriptDialog';
import { contractor } from '../store';
import { fetchFoundationBluePrintList, fetchStructureBluePrintList, fetchFoundationBluePrint, fetchStructureBluePrint } from '../store/blueprintsSlice';
import type { BluePrintListItem, BluePrintDetail } from '../store/blueprintsSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr, configValues } from '../lib/utils';

interface OwnProps {
  id?: string;
  blueprintType?: string;
}

interface StateProps {
  listFoundation: BluePrintListItem[] | null;
  listStructure: BluePrintListItem[] | null;
  detail: BluePrintDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class BluePrint extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.id !== this.props.id ||
         ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.listFoundation !== null && this.props.listFoundation === null ) ||
         ( prevProps.listStructure !== null && this.props.listStructure === null ) ||
         ( prevProps.detail !== null && this.props.detail === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    if( props.id !== undefined )
    {
      if( props.blueprintType === 'foundation' )
      {
        props.dispatch( fetchFoundationBluePrint( props.id ) );
      }
      else
      {
        props.dispatch( fetchStructureBluePrint( props.id ) );
      }
    }
    else
    {
      props.dispatch( fetchFoundationBluePrintList() );
      props.dispatch( fetchStructureBluePrintList() );
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      var blueprint = this.props.detail;
      const isFoundation = this.props.blueprintType === 'foundation';
      return (
        <Box>
          <Link component={ RouterLink } to="/blueprints">&larr; BluePrints</Link>
          <Typography variant="h5" gutterBottom>BluePrint Detail</Typography>
          { blueprint !== null &&
            <Box>
              <ConfigDialog getConfig={ () => contractor.BluePrint_BluePrint_call_getConfig( this.props.id! ) } />
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ blueprint.name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Parents</TableCell><TableCell><ul>{ ( blueprint.parent_list || [] ).map( ( parent: any, index: number ) => {
                    const parentStr = parent.toString();
                    const to = isFoundation ? '/blueprint/f/' + parentStr : '/blueprint/s/' + parentStr;
                    return ( <li key={ index }><Link component={ RouterLink } to={ to }>{ parentStr }</Link></li> );
                  } ) }</ul></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ blueprint.description }</TableCell></TableRow>
                  <TableRow>
                    <TableCell variant="head">Config Values</TableCell>
                    <TableCell>
                      <Table size="small">
                        <TableBody>
                          { configValues( blueprint.config_values ).map( ( value ) => (
                            <TableRow key={ value[0] }>
                              <TableCell variant="head">{ value[0] }</TableCell>
                              <TableCell>{ value[1] }</TableCell>
                            </TableRow>
                          ) ) }
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                  <TableRow><TableCell variant="head">Scripts</TableCell><TableCell><ul>{ Object.entries( blueprint.script_map || {} ).map( ( [ name, uri ] ) => {
                    const scriptId = String( uri ).split( ':' )[ 1 ] ?? String( uri );
                    return ( <li key={ name }>{ name } <ScriptDialog getScript={ ( id: string ) => contractor.BluePrint_Script_get( id ) } id={ scriptId }/></li> );
                  } ) }</ul></TableCell></TableRow>
                  { ( blueprint as any ).foundation_blueprint_list !== undefined &&
                    <TableRow>
                      <TableCell variant="head">Foundation Blueprint</TableCell>
                      <TableCell><ul>
                        { ( ( blueprint as any ).foundation_blueprint_list || [] ).map( ( item: any, index: number ) => {
                          const id = item.toString();
                          return ( <li key={ index }><Link component={ RouterLink } to={ '/blueprint/f/' + id }>{ id }</Link></li> );
                        } ) }
                      </ul></TableCell>
                    </TableRow>
                  }
                  { ( blueprint as any ).foundation_type_list !== undefined &&
                    <TableRow><TableCell variant="head">Type List</TableCell><TableCell>{ ( blueprint as any ).foundation_type_list }</TableCell></TableRow>
                  }
                  { ( blueprint as any ).physical_interface_names !== undefined &&
                    <TableRow><TableCell variant="head">Physical Interface Names</TableCell><TableCell>{ ( blueprint as any ).physical_interface_names }</TableCell></TableRow>
                  }
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( blueprint.created ) }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( blueprint.updated ) }</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
          }
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h5" gutterBottom>Foundation BluePrints</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( this.props.listFoundation || [] ).map( ( item ) => (
              <TableRow key={ item.name }>
                <TableCell><Link component={ RouterLink } to={ '/blueprint/f/' + item.name }>{ item.name }</Link></TableCell>
                <TableCell>{ item.description }</TableCell>
                <TableCell>{ item.created }</TableCell>
                <TableCell>{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Structure BluePrints</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( this.props.listStructure || [] ).map( ( item ) => (
              <TableRow key={ item.name }>
                <TableCell><Link component={ RouterLink } to={ '/blueprint/s/' + item.name }>{ item.name }</Link></TableCell>
                <TableCell>{ item.description }</TableCell>
                <TableCell>{ item.created }</TableCell>
                <TableCell>{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
      </Box>
    );

  }
};

const mapStateToProps = ( state: RootState ) => ( {
  listFoundation: state.blueprints.listF,
  listStructure: state.blueprints.listS,
  detail: state.blueprints.detail,
  authenticated: state.app.authenticated,
  loading: state.blueprints.loading,
  error: state.blueprints.error,
} );

export default connect( mapStateToProps )( BluePrint );
