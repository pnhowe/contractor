import React from 'react';
import {
  AppBar, Box, Button, Chip, CssBaseline, Dialog, DialogActions,
  DialogContent, DialogTitle, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, TextField, Toolbar, Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import MapIcon from '@mui/icons-material/Map';
import RouterIcon from '@mui/icons-material/Router';
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import StorageIcon from '@mui/icons-material/Storage';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DvrIcon from '@mui/icons-material/Dvr';
import PublicIcon from '@mui/icons-material/Public';
import ReorderIcon from '@mui/icons-material/Reorder';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import TimelineIcon from '@mui/icons-material/Timeline';
import UpdateIcon from '@mui/icons-material/Update';
import SyncIcon from '@mui/icons-material/Sync';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import { BrowserRouter as Router, Route, Link as RouterLink } from 'react-router-dom';
import Home from './Home';
import Site from './Site';
import Plot from './Plot';
import Network from './Network';
import Foundation from './Foundation';
import Dependency from './Dependency';
import Structure from './Structure';
import Complex from './Complex';
import BluePrint from './BluePrint';
import PXE from './PXE';
import AddressBlock from './AddressBlock';
import Job from './Job';
import Cartographer from './Cartographer';
import JobLog from './JobLog';
import Todo from './Todo';
import SiteGraph from './SiteGraph';
import SiteSelector from './SiteSelector';
import ServerError from './ServerError';
import Contractor from './Contractor';

const DRAWER_WIDTH = 240;

const navItems = [
  { to: '/', icon: <HomeIcon />, label: 'Home' },
  { to: '/sites', icon: <BusinessIcon />, label: 'Sites' },
  { to: '/plots', icon: <MapIcon />, label: 'Plots' },
  { to: '/networks', icon: <RouterIcon />, label: 'Networks' },
  { to: '/blueprints', icon: <ImportContactsIcon />, label: 'BluePrints' },
  { to: '/pxes', icon: <ImportContactsIcon />, label: 'PXEs' },
  { to: '/foundations', icon: <StorageIcon />, label: 'Foundations' },
  { to: '/dependancies', icon: <GroupWorkIcon />, label: 'Dependancies' },
  { to: '/structures', icon: <AccountBalanceIcon />, label: 'Structures' },
  { to: '/complexes', icon: <LocationCityIcon />, label: 'Complexes' },
  { to: '/addressblocks', icon: <CompareArrowsIcon />, label: 'Address Blocks' },
  { to: '/jobs', icon: <DvrIcon />, label: 'Jobs' },
  { to: '/cartographer', icon: <PublicIcon />, label: 'Cartographer' },
  { to: '/joblog', icon: <ReorderIcon />, label: 'Job Log' },
  { to: '/todo', icon: <CheckBoxIcon />, label: 'Todo' },
  { to: '/graph', icon: <TimelineIcon />, label: 'Graph' },
];

class App extends React.Component
{
  state = {
    cur_site: null,
    loginVisible: false,
    username: '',
    password: '',
    leftDrawerVisable: true,
    autoUpdate: false,
    curJobs: 0,
    alerts: 0
  };

  constructor( props )
  {
    super( props );
    this.contractor = new Contractor( window.API_BASE_URI );
    this.contractor.cinp.server_error_handler = this.serverError;
    this.serverErrorRef = React.createRef();
  }

  menuClick = () =>
  {
    this.setState( { leftDrawerVisable: !this.state.leftDrawerVisable } );
  };

  showLogin = () =>
  {
    this.setState( { loginVisible: true } );
  };

  closeLogin = () =>
  {
    this.setState( { loginVisible: false } );
  };

  doLogin = () =>
  {
    this.contractor.login( this.state.username, this.state.password )
      .then( ( result ) =>
        {
          this.contractor.setAuth( this.state.username, result.data );
          this.setState( { loginVisible: false, password: '' } );
        },
        ( result ) =>
        {
          alert( 'Error logging in: "' + result.detail + '"' );
        } );
  }

  selectSite = ( site ) =>
  {
    this.setState( { cur_site: site }, () => { this.doUpdate(); } );
  };

  serverError = ( msg, trace ) =>
  {
    this.serverErrorRef.current.show( msg, trace );
  };

  doUpdate = () =>
  {
    if ( this.state.cur_site === undefined )
    {
      return;
    }

    if( !this.contractor.authenticated )
    {
      return;
    }

    this.contractor.getJobStats( this.state.cur_site )
      .then( ( result ) =>
        {
          this.setState( { curJobs: result.data.running, alerts: result.data.error } );
        }
     );
  };

  toggleAutoUpdate = () =>
  {
    var state = !this.state.autoUpdate;
    if( state )
    {
      this.timerID = setInterval( () => this.doUpdate(), 10000 );
    }
    else
    {
      clearInterval( this.timerID );
    }
    this.setState( { autoUpdate: state } );
  };

  componentDidMount()
  {
    this.setState( { autoUpdate: false } );
    clearInterval( this.timerID );
  }

  componentWillUnmount()
  {
    clearInterval( this.timerID );
  }

  render()
  {
    return (
<Router>
  <Box sx={{ display: 'flex' }}>
    <CssBaseline />
    <ServerError ref={ this.serverErrorRef } />

    <Dialog open={ this.state.loginVisible } onClose={ this.closeLogin }>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <TextField
          type="text"
          label="Username"
          name="username"
          value={ this.state.username }
          onChange={ (e) => this.setState( { username: e.target.value } ) }
          fullWidth
          margin="dense"
        />
        <TextField
          type="password"
          label="Password"
          name="password"
          value={ this.state.password }
          onChange={ (e) => this.setState( { password: e.target.value } ) }
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={ this.closeLogin }>Close</Button>
        <Button onClick={ this.doLogin } variant="contained">Login</Button>
      </DialogActions>
    </Dialog>

    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton color="inherit" edge="start" onClick={ this.menuClick } sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ mr: 2 }}>Contractor</Typography>
        <SiteSelector onSiteChange={ this.selectSite } curSite={ this.state.cur_site } contractor={ this.contractor } />
        <Box sx={{ flexGrow: 1 }} />
        <Chip icon={ <DvrIcon /> } label={ this.state.curJobs } title="Jobs" sx={{ mr: 1, color: 'white', borderColor: 'white' }} variant="outlined" />
        <Chip icon={ <AnnouncementIcon /> } label={ this.state.alerts } title="Alerts" sx={{ mr: 1, color: 'white', borderColor: 'white' }} variant="outlined" />
        <IconButton color={ this.state.autoUpdate ? 'secondary' : 'inherit' } onClick={ this.toggleAutoUpdate } title="Auto Update">
          <UpdateIcon />
        </IconButton>
        <IconButton color="inherit" onClick={ this.doUpdate } title="Refresh">
          <SyncIcon />
        </IconButton>
        <IconButton color="inherit" onClick={ this.showLogin } title="Login">
          <AccountCircleIcon />
        </IconButton>
      </Toolbar>
    </AppBar>

    <Drawer
      variant="persistent"
      open={ this.state.leftDrawerVisable }
      sx={{
        width: this.state.leftDrawerVisable ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: 'width 0.2s',
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List dense>
        { navItems.map( ( item ) => (
          <ListItem key={ item.to } disablePadding>
            <ListItemButton component={ RouterLink } to={ item.to }>
              <ListItemIcon>{ item.icon }</ListItemIcon>
              <ListItemText primary={ item.label } />
            </ListItemButton>
          </ListItem>
        ) ) }
      </List>
    </Drawer>

    <Box
      component="main"
      sx={{
        flexGrow: 1,
        minWidth: 0
      }}
    >
      <Toolbar />
      <Route exact={true} path="/" component={ Home }/>
      <Route path="/site/:id" render={ ( { match } ) => ( <Site id={ match.params.id } contractor={ this.contractor } detailGet={ this.contractor.getSite } getConfig={ this.contractor.getConfig } /> ) } />
      <Route path="/plot/:id" render={ ( { match } ) => ( <Plot id={ match.params.id } detailGet={ this.contractor.getPlot } /> ) } />
      <Route path="/blueprint/f/:id" render={ ( { match } ) => ( <BluePrint id={ match.params.id } detailGet={ this.contractor.getFoundationBluePrint } getConfig={ this.contractor.getConfig } getScript={ this.contractor.getScript }/> ) } />
      <Route path="/network/:id" render={ ( { match } ) => ( <Network id={ match.params.id } detailGet={ this.contractor.getNetwork } getNetworkAddressBlockList={ this.contractor.getNetworkAddressBlockList } /> ) } />
      <Route path="/blueprint/s/:id" render={ ( { match } ) => ( <BluePrint id={ match.params.id } detailGet={ this.contractor.getStructureBluePrint } getConfig={ this.contractor.getConfig } getScript={ this.contractor.getScript } /> ) } />
      <Route path="/pxe/:id" render={ ( { match } ) => ( <PXE id={ match.params.id } detailGet={ this.contractor.getPXE } /> ) } />
      <Route path="/foundation/:id" render={ ( { match } ) => ( <Foundation id={ match.params.id } detailGet={ this.contractor.getFoundation } getFoundationInterfaces={ this.contractor.getFoundationInterfaces } detailGetDependancies={ this.contractor.getFoundationDependandyList } getConfig={ this.contractor.getConfig } /> ) } />
      <Route path="/dependency/:id" render={ ( { match } ) => ( <Dependency id={ match.params.id } detailGet={ this.contractor.getDependency } /> ) } />
      <Route path="/structure/:id" render={ ( { match } ) => ( <Structure id={ match.params.id } detailGet={ this.contractor.getStructure } getConfig={ this.contractor.getConfig } getAddressList={ this.contractor.getStructureAddressList } /> ) } />
      <Route path="/complex/:id" render={ ( { match } ) => ( <Complex id={ match.params.id } detailGet={ this.contractor.getComplex } getConfig={ this.contractor.getConfig } /> ) } />
      <Route path="/addressblock/:id" render={ ( { match } ) => ( <AddressBlock id={ match.params.id } detailGet={ this.contractor.getAddressBlock } addressListGetter={ this.contractor.getAddressBlockAddresses } /> ) } />
      <Route path="/job/f/:id" render={ ( { match } ) => ( <Job id={ match.params.id } jobType="foundation" contractor={ this.contractor } /> ) } />
      <Route path="/job/s/:id" render={ ( { match } ) => ( <Job id={ match.params.id } jobType="structure" contractor={ this.contractor } /> ) } />
      <Route path="/job/d/:id" render={ ( { match } ) => ( <Job id={ match.params.id } jobType="dependency" contractor={ this.contractor } /> ) } />
      <Route exact={true} path="/sites" render={ () => ( <Site contractor={ this.contractor } /> ) } />
      <Route exact={true} path="/plots" render={ () => ( <Plot listGet={ this.contractor.getPlotList } /> ) } />
      <Route exact={true} path="/networks" render={ () => ( <Network site={ this.state.cur_site } listGet={ this.contractor.getNetworkList } /> ) } />
      <Route exact={true} path="/blueprints" render={ () => ( <BluePrint listGetF={ this.contractor.getFoundationBluePrintList } listGetS={ this.contractor.getStructureBluePrintList } /> ) }/>
      <Route exact={true} path="/pxes" render={ () => ( <PXE site={ this.state.cur_site } listGet={ this.contractor.getPXEList } /> ) } />
      <Route exact={true} path="/foundations" render={ () => ( <Foundation site={ this.state.cur_site } listGet={ this.contractor.getFoundationList } /> ) } />
      <Route exact={true} path="/dependancies" render={ () => ( <Dependency site={ this.state.cur_site } listGet={ this.contractor.getDependencyList } /> ) } />
      <Route exact={true} path="/structures" render={ () => ( <Structure site={ this.state.cur_site } listGet={ this.contractor.getStructureList } /> ) } />
      <Route exact={true} path="/complexes" render={ () => ( <Complex site={ this.state.cur_site } listGet={ this.contractor.getComplexList } /> ) } />
      <Route exact={true} path="/addressblocks" render={ () => ( <AddressBlock site={ this.state.cur_site } listGet={ this.contractor.getAddressBlockList } /> ) } />
      <Route exact={true} path="/jobs" render={ () => ( <Job site={ this.state.cur_site } listGetF={ this.contractor.getFoundationJobList } listGetS={ this.contractor.getStructureJobList } listGetD={ this.contractor.getDependencyJobList } /> ) } />
      <Route exact={true} path="/cartographer" render={ () => ( <Cartographer listGet={ this.contractor.getCartographerList } /> ) } />
      <Route exact={true} path="/joblog" render={ () => ( <JobLog site={ this.state.cur_site } listGet={ this.contractor.getJobLogList } /> ) } />
      <Route exact={true} path="/todo" render={ () => ( <Todo site={ this.state.cur_site } listGet={ this.contractor.getTodoList } classListGet={ this.contractor.getFoundationClassList } /> ) } />
      <Route exact={true} path="/graph" render={ () => ( <SiteGraph site={ this.state.cur_site } siteDependencyMap={ this.contractor.getSiteDependencyMap } /> ) } />
    </Box>
  </Box>
</Router>
    );
  }

}

export default App;
