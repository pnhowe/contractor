import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { contractor, store } from '../store';

interface SiteSelectorProps {
  onSiteChange: ( site: string ) => void;
  curSite: string | null;
}

interface SiteSelectorState {
  site_list: { value: string; label: string }[];
}

class SiteSelector extends React.Component<SiteSelectorProps, SiteSelectorState>
{
  state: SiteSelectorState = {
    site_list: []
  };

  handleChange = ( event: any ) =>
  {
    this.props.onSiteChange( event.target.value );
  }

  componentDidUpdate( prevProps: SiteSelectorProps )
  {
    if( prevProps.curSite === null )
    {
      this.componentDidMount();
    }
  }

  componentDidMount()
  {
    if( !store.getState().app.authenticated )
    {
      return;
    }

    contractor.Site_Site_get_multi( { filter: undefined } )
      .then( ( result: any ) =>
      {
        var site_list: { value: string; label: string }[] = [];
        for ( var key in result )
        {
          const site = result[ key ];
          site_list.push( { value: site.name, label: site.description } );
        }

        this.setState( { site_list: site_list } );
        if( site_list.length > 0 )
        {
          this.props.onSiteChange( site_list[0].value );
        }
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
