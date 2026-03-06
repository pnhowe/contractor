import React from 'react';
import CInP from './cinp';
import { Box, Checkbox, FormControl, FormControlLabel, InputLabel, Link, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Todo extends React.Component
{
  constructor( props )
  {
    super( props );
    this.props.classListGet()
    .then( ( result ) =>
    {
      var foundationClass_list = []
      foundationClass_list.push( { value: '', label: '<All>' } )
      for ( var index in result.data )
      {
        foundationClass_list.push( { value: result.data[ index ], label: result.data[ index ] } );
      }

      this.setState( { foundationClass_list: foundationClass_list} );
    } );
  }

  state = {
      foundation_list: [],
      foundationClass_list: [],
      hasDependancies: false,
      foundationClass: ''
  };

  handleOptionChange = ( field, value ) =>
  {
    this.setState( { [ field ]: value }, () => this.update( this.props ) );
  };

  handleClassChange = ( event ) =>
  {
    this.setState( { foundationClass: event.target.value || null }, () => this.update( this.props ) );
  };

  componentDidMount()
  {
    this.update( this.props );
  };

  componentDidUpdate( prevProps )
  {
    if ( prevProps.site !== this.props.site )
    {
      this.setState( { foundation_list: [] } );
      this.update( this.props );
    }
  }

  update( props )
  {
    props.listGet( props.site, this.state.hasDependancies, this.state.foundationClass || null )
      .then( ( result ) =>
      {
        var foundation_list = [];
        for ( var id in result.data )
        {
          var foundation = result.data[ id ];
          id = CInP.extractIds( id )[0];
          foundation_list.push( { id: id,
                                  locator: foundation.locator,
                                  dependencyCount: ' ',
                                  complex: ' ',
                                  created: foundation.created,
                                  updated: foundation.updated
                                } );
        }

        this.setState( { foundation_list: foundation_list } );
      } );
  }

  render()
  {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={ this.state.hasDependancies }
                onChange={ (e) => this.handleOptionChange( 'hasDependancies', e.target.checked ) }
              />
            }
            label="Has Dependancies"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Foundation Class</InputLabel>
            <Select
              value={ this.state.foundationClass || '' }
              onChange={ this.handleClassChange }
              label="Foundation Class"
            >
              { this.state.foundationClass_list.map( ( item ) => (
                <MenuItem key={ item.value } value={ item.value }>{ item.label }</MenuItem>
              ) ) }
            </Select>
          </FormControl>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">Id</TableCell>
              <TableCell>Locator</TableCell>
              <TableCell>Num Dependants</TableCell>
              <TableCell>Complex</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { this.state.foundation_list.map( ( item ) => (
              <TableRow key={ item.id }>
                <TableCell align="right"><Link component={ RouterLink } to={ '/foundation/' + item.id }>{ item.id }</Link></TableCell>
                <TableCell>{ item.locator }</TableCell>
                <TableCell>{ item.dependencyCount }</TableCell>
                <TableCell>{ item.complex }</TableCell>
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

export default Todo;
