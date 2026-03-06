import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

class SiteSelector extends React.Component
{
  state = {
    site_list: []
  }

  handleChange = ( event ) =>
  {
    this.props.onSiteChange( event.target.value );
  }

  componentDidUpdate( prevProps )
  {
    if( prevProps.curSite === null )
    {
      this.componentDidMount();
    }
  }

  componentDidMount()
  {
    if( !this.props.contractor.authenticated )
    {
      return;
    }

    this.props.contractor.getSiteList()
      .then( ( result ) =>
      {
        var site_list = [];
        for ( var site in result.data )
        {
          site_list.push( { value: site, label: result.data[ site ].description } );
        }

        this.setState( { site_list: site_list } );
        this.props.onSiteChange( site_list[0].value );
      } );
  }

  render()
  {
    return (
<FormControl size="small" sx={{ minWidth: 150 }}>
  <InputLabel>Site</InputLabel>
  <Select
    value={ this.props.curSite || '' }
    onChange={ this.handleChange }
    label="Site"
  >
    { this.state.site_list.map( ( site ) => (
      <MenuItem key={ site.value } value={ site.value }>{ site.label }</MenuItem>
    ) ) }
  </Select>
</FormControl>
);
  }
};

export default SiteSelector;
