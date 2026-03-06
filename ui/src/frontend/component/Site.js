import React from 'react';
import CInP from './cinp';
import ConfigDialog from './ConfigDialog';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Site extends React.Component
{
  state = {
      site_list: [],
      site: null
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id )
    {
      this.setState( { site_list: [], site: null } );
      this.update( this.props );
    }
  }

  update( props )
  {
    if( props.id !== undefined )
    {
      props.contractor.getSite( props.id )
       .then( ( result ) =>
        {
          var data = result.data;
          data.parent = CInP.extractIds( data.parent )[0];
          data.config_values = Object.keys( data.config_values ).map( ( key ) => ( [ key, data.config_values[ key ] ] ) );
          this.setState( { site: data } );
        } );
    }
    else
    {
      if( !props.contractor.authenticated )
      {
        return;
      }
      props.contractor.getSiteList()
        .then( ( result ) =>
        {
          var site_list = [];
          for ( var name in result.data )
          {
            var site = result.data[ name ];
            name = CInP.extractIds( name )[0];
            site_list.push( { name: name,
                              description: site.description,
                              created: site.created,
                              updated: site.updated,
                            } );
          }

          this.setState( { site_list: site_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var site = this.state.site;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Site Detail</Typography>
          { site !== null &&
            <Box>
              <ConfigDialog getConfig={ this.props.getConfig } uri={ '/api/v1/Site/Site:' + this.props.id + ':' } />
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ site.name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Parent</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + site.parent }>{ site.parent }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ site.description }</TableCell></TableRow>
                  <TableRow>
                    <TableCell variant="head">Config Values</TableCell>
                    <TableCell>
                      <Table size="small">
                        <TableBody>
                          { site.config_values.map( ( value ) => (
                            <TableRow key={ value[0] }>
                              <TableCell variant="head">{ value[0] }</TableCell>
                              <TableCell>{ JSON.stringify( value[1] ) }</TableCell>
                            </TableRow>
                          ) ) }
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ site.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ site.updated }</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
          }
        </Box>
      );
    }

    return (
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
          { this.state.site_list.map( ( item ) => (
            <TableRow key={ item.name } >
              <TableCell><Link component={ RouterLink } to={ '/site/' + item.name }>{ item.name }</Link></TableCell>
              <TableCell>{ item.description }</TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

export default Site;
