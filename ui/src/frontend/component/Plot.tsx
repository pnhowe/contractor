import React from 'react';
import { connect } from 'react-redux';
import { fetchPlotList, fetchPlot } from '../store/plotsSlice';
import type { PlotListItem, PlotDetail } from '../store/plotsSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr } from '../lib/utils';

interface OwnProps {
  id?: string;
}

interface StateProps {
  list: PlotListItem[] | null;
  detail: PlotDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class Plot extends React.Component<Props>
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
      props.dispatch( fetchPlot( props.id ) );
    }
    else
    {
      props.dispatch( fetchPlotList() );
    }
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      var plot = this.props.detail;
      return (
        <Box>
          <Link component={ RouterLink } to="/plots">&larr; Plots</Link>
          <Typography variant="h5" gutterBottom>Plot Detail</Typography>
          { plot !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ plot.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Parent</TableCell><TableCell><Link component={ RouterLink } to={ '/plot/' + plot.parent?.toString() }>{ plot.parent?.toString() }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Corners</TableCell><TableCell>{ plot.corners }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( plot.created ) }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( plot.updated ) }</TableCell></TableRow>
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
            <TableCell>Name</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.name } >
              <TableCell><Link component={ RouterLink } to={ '/plot/' + item.name }>{ item.name }</Link></TableCell>
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
  list: state.plots.list,
  detail: state.plots.detail,
  authenticated: state.app.authenticated,
  loading: state.plots.loading,
  error: state.plots.error,
} );

export default connect( mapStateToProps )( Plot );
