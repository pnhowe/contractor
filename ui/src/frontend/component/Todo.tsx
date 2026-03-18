import React from 'react';
import { connect } from 'react-redux';
import { fetchFoundationClassList, fetchTodoList } from '../store/todoSlice';
import type { TodoFoundationItem } from '../store/todoSlice';
import { Alert, Box, Checkbox, CircularProgress, FormControl, FormControlLabel, InputLabel, Link, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';

interface OwnProps {
  site?: string;
}

interface StateProps {
  list: TodoFoundationItem[] | null;
  classList: string[] | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

interface TodoLocalState {
  hasDependancies: boolean;
  foundationClass: string;
}

class Todo extends React.Component<Props, TodoLocalState>
{
  state: TodoLocalState = {
    hasDependancies: false,
    foundationClass: ''
  };

  handleOptionChange = ( field: string, value: any ) =>
  {
    this.setState( { [ field ]: value } as any, () => this.update( this.props ) );
  };

  handleClassChange = ( event: any ) =>
  {
    this.setState( { foundationClass: event.target.value || null }, () => this.update( this.props ) );
  };

  componentDidMount()
  {
    this.props.dispatch( fetchFoundationClassList() );
    this.update( this.props );
  };

  componentDidUpdate( prevProps: Props )
  {
    if ( !prevProps.authenticated && this.props.authenticated )
    {
      this.props.dispatch( fetchFoundationClassList() );
    }
    if ( ( !prevProps.authenticated && this.props.authenticated ) ||
         prevProps.site !== this.props.site ||
         ( prevProps.list !== null && this.props.list === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    props.dispatch( fetchTodoList( { site: props.site, hasDependancies: this.state.hasDependancies, foundationClass: this.state.foundationClass || null } ) );
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    var foundationClass_list: { value: string; label: string }[] = [ { value: '', label: '<All>' } ];
    if ( this.props.classList )
    {
      for ( var index in this.props.classList )
      {
        foundationClass_list.push( { value: this.props.classList[ index ], label: this.props.classList[ index ] } );
      }
    }

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
              { foundationClass_list.map( ( item ) => (
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
            { ( this.props.list || [] ).map( ( item ) => (
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

const mapStateToProps = ( state: RootState ) => ( {
  list: state.todo.list,
  classList: state.todo.classList,
  authenticated: state.app.authenticated,
  loading: state.todo.loading,
  error: state.todo.error,
} );

export default connect( mapStateToProps )( Todo );
