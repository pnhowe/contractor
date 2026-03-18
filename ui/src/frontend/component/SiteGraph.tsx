import React from 'react';
import { connect } from 'react-redux';
import { fetchSiteGraph } from '../store/siteGraphSlice';
import type { SiteGraphData } from '../store/siteGraphSlice';
import { VisSingleContainer, VisGraph } from '@unovis/react';
import { GraphLayoutType, GraphNodeShape, GraphLinkArrowStyle } from '@unovis/ts';
import { Alert, Box, CircularProgress, Color } from '@mui/material';
import type { RootState, AppDispatch } from '../store';

interface OwnProps {
  site?: string;
}

interface StateProps {
  graph: SiteGraphData | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

const typeShape = ( n: any ): GraphNodeShape =>
{
  switch ( n.type )
  {
    case 'Structure': return GraphNodeShape.Circle;
    case 'Foundation': return GraphNodeShape.Square;
    case 'Complex': return GraphNodeShape.Hexagon;
    default: return GraphNodeShape.Triangle;
  }
};

const stateColor = ( n: any ): string =>
{
  switch ( n.state )
  {
    case 'planned': return '#88FF88';
    case 'located': return '#8888FF';
    case 'built': return '#DDDDDD';
    default: return '#FF8888';
  }
};

class SiteGraph extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.site !== this.props.site ||
         ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.graph !== null && this.props.graph === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    props.dispatch( fetchSiteGraph( props.site ) );
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    const src = this.props.graph || { nodes: [], edges: [] };
    const nodes = src.nodes.map( ( n: any ) => ( { ...n } ) );
    const links = src.edges.map( ( e: any ) => ( { source: e.from, target: e.to } ) );

    return (
      <VisSingleContainer style={{ width: '100%' }} height={ 1000 }>
          <VisGraph
            data={{ nodes, links }}
            nodeLabel={ ( n: any ) => n.label }
            nodeIcon={ () => '' }
            nodeShape={ typeShape }
            nodeFill={ stateColor }
            nodeStroke={ ( n: any ) => n.external ? '#DDDDDD' : '#FF0000' }
            nodeStrokeWidth={ ( n: any ) => n.has_job ? 3 : 1 }
            linkArrow={ GraphLinkArrowStyle.Single }
            layoutType={ GraphLayoutType.Dagre }
          />
        </VisSingleContainer>
    );
  }
}

const mapStateToProps = ( state: RootState ) => ( {
  graph: state.siteGraph.graph,
  authenticated: state.app.authenticated,
  loading: state.siteGraph.loading,
  error: state.siteGraph.error,
} );

export default connect( mapStateToProps )( SiteGraph );
