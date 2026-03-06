import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

class ServerError extends React.Component
{
  state = {
      active: false,
      msg: '',
      trace: '',
  };

  show = ( msg, trace ) =>
  {
    if( trace === undefined )
    {
      trace = '';
    }
    this.setState( { active: true, msg: msg, trace: trace } )
  };

  close = () =>
  {
    this.setState( { active: false } );
  };

  render()
  {
    return (
  <Dialog open={ this.state.active } onClose={ this.close } maxWidth="lg">
    <DialogTitle>Server Error</DialogTitle>
    <DialogContent>
      <p>{ this.state.msg }</p>
      <pre>{ this.state.trace }</pre>
    </DialogContent>
    <DialogActions>
      <Button onClick={ this.close }>Close</Button>
    </DialogActions>
  </Dialog>
);
  }
}

export default ServerError;
