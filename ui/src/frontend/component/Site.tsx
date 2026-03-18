import React from 'react';
import { connect } from 'react-redux';
import ConfigDialog from './ConfigDialog';
import { contractor } from '../store';
import { fetchSiteList, fetchSite } from '../store/sitesSlice';
import type { SiteListItem, SiteDetail } from '../store/sitesSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr, configValues } from '../lib/utils';

interface OwnProps {
  id?: string;
}

interface StateProps {
  list: SiteListItem[] | null;
  detail: SiteDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class Site extends React.Component<Props>
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
      props.dispatch( fetchSite( props.id ) );
    }
    else
    {
      props.dispatch( fetchSiteList() );
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      var site = this.props.detail;
      return (
        <Box>
          <Link component={ RouterLink } to="/sites">&larr; Sites</Link>
          <Typography variant="h5" gutterBottom>Site Detail</Typography>
          { site !== null &&
            <Box>
              <ConfigDialog getConfig={ () => contractor.Site_Site_call_getConfig( this.props.id! ) } />
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ site.name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Parent</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + site.parent?.toString() }>{ site.parent?.toString() }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ site.description }</TableCell></TableRow>
                  <TableRow>
                    <TableCell variant="head">Config Values</TableCell>
                    <TableCell>
                      <Table size="small">
                        <TableBody>
                          { configValues( site.config_values ).map( ( value ) => (
                            <TableRow key={ value[0] }>
                              <TableCell variant="head">{ value[0] }</TableCell>
                              <TableCell>{ value[1] }</TableCell>
                            </TableRow>
                          ) ) }
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( site.created ) }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( site.updated ) }</TableCell></TableRow>
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
          { ( this.props.list || [] ).map( ( item ) => (
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

const mapStateToProps = ( state: RootState ) => ( {
  list: state.sites.list,
  detail: state.sites.detail,
  authenticated: state.app.authenticated,
  loading: state.sites.loading,
  error: state.sites.error,
} );

export default connect( mapStateToProps )( Site );
