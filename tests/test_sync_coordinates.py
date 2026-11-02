import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('sync', Path(__file__).resolve().parents[1]/'scripts/sync_official.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
class CoordinateContracts(unittest.TestCase):
    def test_signed_pin_coordinates(self):
        self.assertEqual(sync.signed_coordinate('-11'), -11)
        self.assertIsNone(sync.number('-11'))
        for value in [True, None, 'nan', 'inf', 'broken']:
            self.assertIsNone(sync.signed_coordinate(value))
    def test_literal_ampersand_does_not_empty_play_shop_name(self):
        self.assertEqual(sync.plain('헤이로 헤어&헤드스파'), '헤이로 헤어&헤드스파')
        row={'playSeq':20,'playNm':'전망대 게임장','majorSrvcNm':'게임','pstnCd':'HA00104'}
        record=sync.normalize(row,'playshops',{})
        self.assertEqual(record['id'],'playshop-20')
        self.assertEqual(record['menu'],'게임')
if __name__ == '__main__': unittest.main()
