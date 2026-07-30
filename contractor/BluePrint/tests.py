from contractor.BluePrint.lib import validateTemplate


def test_validate_template():
  id_map = { 'hardware': None, 'network': None, 'disks': None }
  validation_template = {}

  validateTemplate( id_map, validation_template )


def test_validate_template_nested():
  id_map = { 'network': { 'eth0': { 'mac': 'aa:bb:cc:dd:ee:ff' } }, 'hardware': { 'vendor': 'Acme' } }

  assert validateTemplate( id_map, { 'network.eth0.mac': r'^[0-9a-f:]+$' } ) is None
  assert validateTemplate( id_map, { 'hardware.vendor': r'^Acme$' } ) is None

  assert validateTemplate( id_map, { 'network.eth0.mac': r'^ZZZ$' } ) == 'Item "network.eth0.mac" does not match "aa:bb:cc:dd:ee:ff"'
  assert validateTemplate( id_map, { 'network.eth1.mac': r'.*' } ) == 'Item "network.eth1.mac" not found'
  assert validateTemplate( id_map, { 'bogus': r'.*' } ) == 'Item "bogus" not found'
  assert validateTemplate( id_map, { 'hardware.vendor.extra': r'.*' } ) == 'Item "hardware.vendor.extra" not found'
