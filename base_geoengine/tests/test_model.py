# Copyright 2023 ACSONE SA/NV

import geojson
from odoo_test_helper import FakeModelLoader
from shapely import wkt
from shapely.geometry import shape

from odoo.tests.common import TransactionCase

from ..fields import GeoPoint


class TestModel(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.loader = FakeModelLoader(cls.env, cls.__module__)
        cls.loader.backup_registry()

        from .models import DummyZip, GeoModelTest, RetailMachine

        cls.loader.update_registry((GeoModelTest, DummyZip, RetailMachine))
        cls.geo_model = cls.env["geo.model.test"].create({})
        cls.env["dummy.zip"].create(
            {
                "name": "1146",
                "city": "Mollens (VD))",
                "the_geom": "MULTIPOLYGON (((711089.693203108 5873735.48072837, "
                + "711092.576313001 5873519.88384687,"
                + "711067.054090924 5873435.51305599,710995.218898879 5873198.04330687,"
                + "710996.388615927 5873110.64387336,711039.179454242 5873060.22832024,"
                + "711042.287896265 5872936.43418925,711026.423105771 5872819.67065428,"
                + "711261.754450894 5872597.025222,711241.609394529 5872474.38185775,"
                + "711059.74912495 5872499.61499977,710956.020676372 5872329.22952511,"
                + "710692.244689654 5872290.70879558,710486.478264092 5871933.93784652,"
                + "710024.93171231 5872025.28274803,710005.024342666 5871778.82753806,"
                + "709728.110667306 5871639.59028651,709724.582871056 5871578.36223351,"
                + "709682.212415895 5871490.38595657,709610.808017364 5871402.01470814,"
                + "709552.306572401 5871356.73905814,709495.853317159 5871313.04976156,"
                + "709236.521364341 5871163.84756429,709195.304008703 5871128.42409022,"
                + "709150.409305552 5871089.84044459,709093.837273492 5871008.051534,"
                + "709008.015634898 5870883.97195414,708922.106609628 5870795.4022844,"
                + "708836.258869397 5870702.46391409,708174.672218121 5871197.33373336,"
                + "707846.164800298 5870800.97891085,707605.589841331 5870979.71730235,"
                + "706369.331113847 5871966.12906172,706306.149363559 5872332.34885008,"
                + "705390.804735349 5873401.94343156,704603.284854186 5873838.0955764,"
                + "704092.91256737 5873980.90856737,704011.87512573 5873857.35915706,"
                + "703030.73225885 5874621.40143472,702006.482932752 5874937.39404808,"
                + "702849.34839414 5875420.27638601,705799.405382342 5875341.31671473,"
                + "707632.65678248 5875553.44607092,708858.019414722 5875286.16417218,"
                + "709639.976192618 5874932.54154212,709800.865455979 5874636.00773277,"
                + "710188.467536495 5874437.27183537,710138.406154331 5874271.93819522,"
                + "710464.959230515 5874290.93364989,711089.693203108 5873735.48072837)\
                    ))",
            }
        )

        cls.env["dummy.zip"].create(
            {
                "name": "1169",
                "city": "Yens",
                "the_geom": "MULTIPOLYGON (((712499.646588959 5867275.9182732,"
                + "713419.026718887 5867001.27747293,714015.722251894 5866538.88540113,"
                + "714694.030364397 5866492.43868073,714765.262342783 5865922.7082706,"
                + "714997.785886538 5865558.90341594,715151.666992536 5865665.71173242,"
                + "715609.031373263 5865079.20249973,715885.038705088 5865053.65786512,"
                + "716495.789172412 5864492.40980924,716976.367311019 5864008.08379334,"
                + "716781.749152281 5863910.99389739,716608.651725694 5863833.09642092,"
                + "716518.052861577 5863201.78267731,716064.089435707 5863535.02734419,"
                + "715643.594094414 5862954.76617529,715325.079468014 5863244.60059218,"
                + "715203.241075229 5863130.96403033,715274.223325112 5862913.60004965,"
                + "714897.772002756 5862635.12980843,714563.017533803 5862610.39226806,"
                + "714258.266707042 5862620.95887512,714249.030777221 5862438.94330443,"
                + "713724.197313172 5862641.59763197,713517.069387174 5862507.90536999,"
                + "712861.144693087 5862860.12184101,713026.004126525 5862898.68588355,"
                + "712886.267874965 5863045.26900106,712827.103281182 5863131.79990304,"
                + "712738.929710136 5863217.94640341,712691.900706143 5863250.04961387,"
                + "712592.546151257 5863317.87261312,712504.368398659 5863404.01855574,"
                + "712405.215033586 5863533.04505435,712371.521154897 5863576.88960266,"
                + "712355.411589612 5863605.09059754,712223.007660214 5863836.87550522,"
                + "712156.578632893 5863923.31295655,712134.435332338 5863952.12551606,"
                + "712134.049617032 5863981.22835121,712079.319781245 5864066.52919356,"
                + "712059.980001849 5864096.67295644,712051.318250669 5864144.84287664,"
                + "712044.316598475 5864183.7895569,711908.743067266 5864560.40002656,"
                + "711809.521376786 5864821.06690256,711185.861440992 5865020.84754387,"
                + "710829.505021716 5865627.41104201,710236.389289627 5865815.90923937,"
                + "710091.432898977 5866557.84150433,709133.629951634 5866771.90114324,"
                + "709458.164419682 5866919.01207252,709913.809001053 5867137.78068809,"
                + "710889.333222594 5868419.19110438,711446.96086477 5867965.10731405,"
                + "711555.097159712 5867474.42262634,711838.254231148 5867572.85286263,"
                + "711873.968689887 5867287.95989594,712499.646588959 5867275.9182732)\
                    ))",
            }
        )

        cls.env["retail.machine"].create(
            {
                "name": "34",
                "total_sales": 734.0,
                "money_level": "low",
                "the_point": "POINT(711341.795470746 5866150.25857961)",
                "state": "ok",
            }
        )

        cls.env["retail.machine"].create(
            {
                "name": "33",
                "total_sales": 492.0,
                "money_level": "low",
                "the_point": "POINT(711652.69365366 5866548.27641024)",
                "state": "ok",
            }
        )

        cls.env["retail.machine"].create(
            {
                "name": "18",
                "total_sales": 892.0,
                "money_level": "high",
                "the_point": "POINT(708451.36372351 5872547.88349207)",
                "state": "ok",
            }
        )

        cls.env["retail.machine"].create(
            {
                "name": "23",
                "total_sales": 1781.0,
                "money_level": "high",
                "the_point": "POINT(708037.67602773 5873788.9465794)",
                "state": "ok",
            }
        )

        cls.env["retail.machine"].create(
            {
                "name": "21",
                "total_sales": 1533.0,
                "money_level": "high",
                "the_point": "POINT(706962.088018701 5873623.47150109)",
                "state": "ok",
            }
        )

    @classmethod
    def tearDownClass(cls):
        cls.loader.restore_registry()
        super().tearDownClass()

    def test_create_multipolygon_wkt_format(self):
        """Create a multi polygon"""
        multi_polygon = """MULTIPOLYGON (((726469.938970306 5873145.03456248,
        726520.174105436 5872946.03059195,726394.076006275 5872675.04267336,
        726404.709252018 5872259.98652277,726212.557712441 5871801.78900894,
        726471.645243121 5871748.01187117,726384.798016214 5871474.60597039,
        726524.862821204 5871416.52279756,726560.408193573 5870936.9668625,
        726765.583679957 5870941.58021817,726800.675791552 5870794.8818083,
        726830.398385972 5870610.25496982,726667.324961485 5870525.33567258,
        726559.158856422 5870713.41380138,726483.618814776 5870842.15916191,
        726282.880000044 5870874.76667995,726075.942331799 5870940.79690473,
        726060.620082161 5870636.20922038,725995.373875086 5870504.36168216,
        725871.917698916 5870508.73664946,725866.910956205 5870440.22483982,
        725760.074408205 5870513.2465806,724947.130321146 5870506.55170525,
        724956.64886783 5870684.35364044,724709.437725183 5870717.82930599,
        724640.837901402 5870502.91208435,723632.716917063 5871035.58668793,
        723353.587063504 5870580.71145654,722975.340414945 5870644.60022452,
        723063.193608096 5871187.48904965,723286.565782157 5871691.25884814,
        722865.254617585 5871951.28387527,722963.962738856 5872074.84140304,
        722831.245902295 5872122.76389775,722813.837916803 5872242.00526964,
        722827.655983236 5872300.44254147,722913.370119188 5872418.02105384,
        722942.233783707 5872432.93796481,722984.741992683 5872520.85895895,
        723012.381471722 5872637.73702376,723086.082443995 5872667.76380156,
        723157.229378648 5872668.62290333,723214.748202491 5872698.34771906,
        723250.508284339 5872761.5280976,723286.16249158 5872815.86084868,
        723315.028102666 5872830.77719621,723502.328395902 5872819.6206505,
        723518.483057357 5872818.65863173,723567.82777813 5872844.15493286,
        723749.413939088 5872937.98130854,723848.429817139 5873019.41326079,
        723893.228455684 5873056.25562596,724000.782399525 5873179.05937195,
        724022.179653074 5873203.48913931,724167.213521721 5873219.79321866,
        724240.443943894 5873257.62460164,724345.033870514 5873311.65740904,
        724427.033053176 5873354.0176493,724458.116953997 5873354.38826826,
        724601.342527281 5873356.09453768,724659.368258544 5873356.78513641,
        724699.259216658 5873263.86039926,724734.038257937 5873182.84407915,
        724769.196071982 5873148.4004069,724792.808935311 5873125.2670227,
        724828.594968331 5873107.84535952,724909.660761314 5873068.37954232,
        724968.429515518 5873010.80204763,724969.116329931 5872952.53572905,
        725027.883915669 5872894.95858978,725144.902548535 5872823.50310579,
        725202.982873244 5872824.19072548,725231.165281494 5872845.9215328,
        725260.549561619 5872868.5770444,725323.492507265 5872998.67536266,
        725345.617620278 5873044.40573114,725374.316461685 5873073.88235996,
        725461.097697554 5873104.044911,725548.221016413 5873105.07306152,
        725593.723206956 5873117.05713947,725633.818030441 5873127.61507632,
        725664.044374598 5873135.57621915,725715.023293758 5873205.45921561,
        725835.567474206 5873370.70034401,725849.407491127 5873429.14029691,
        725878.279489341 5873444.04917682,725936.874293492 5873401.02996477,
        725995.978527806 5873314.30901098,726070.62161125 5873140.35732493,
        726085.312084189 5873125.96087534,726100.002508819 5873111.56442448,
        726217.015284978 5873040.09276485,726304.138055426 5873041.11333845,
        726469.938970306 5873145.03456248)))"""
        multi_polygon_loaded = wkt.loads(multi_polygon)
        self.geo_model.geo_multi_polygon = multi_polygon
        self.assertTrue(
            self.geo_model.geo_multi_polygon.equals_exact(
                multi_polygon_loaded, tolerance=0.2
            )
        )

    def test_create_multipolygon_geojson_format(self):
        multi_polygon_geojson = """{"type":"MultiPolygon","coordinates":[[[
        [726469.938970306,5873145.03456248],[726520.174105436,5872946.03059195],
        [726394.076006275,5872675.04267336],[726404.709252018,5872259.98652277],
        [726212.557712441,5871801.78900894],[726471.645243121,5871748.01187117],
        [726384.798016214,5871474.60597039],[726524.862821204,5871416.52279756],
        [726560.408193573,5870936.9668625],[726765.583679957,5870941.58021817],
        [726800.675791552,5870794.8818083],[726830.398385972,5870610.25496982],
        [726667.324961485,5870525.33567258],[726559.158856422,5870713.41380138],
        [726483.618814776,5870842.15916191],[726282.880000044,5870874.76667995],
        [726075.942331799,5870940.79690473],[726060.620082161,5870636.20922038],
        [725995.373875086,5870504.36168216],[725871.917698916,5870508.73664946],
        [725866.910956205,5870440.22483982],[725760.074408205,5870513.2465806],
        [724947.130321146,5870506.55170525],[724956.64886783,5870684.35364044],
        [724709.437725183,5870717.82930599],[724640.837901402,5870502.91208435],
        [723632.716917063,5871035.58668793],[723353.587063504,5870580.71145654],
        [722975.340414945,5870644.60022452],[723063.193608096,5871187.48904965],
        [723286.565782157,5871691.25884814],[722865.254617585,5871951.28387527],
        [722963.962738856,5872074.84140304],[722831.245902295,5872122.76389775],
        [722813.837916803,5872242.00526964],[722827.655983236,5872300.44254147],
        [722913.370119188,5872418.02105384],[722942.233783707,5872432.93796481],
        [722984.741992683,5872520.85895895],[723012.381471722,5872637.73702376],
        [723086.082443995,5872667.76380156],[723157.229378648,5872668.62290333],
        [723214.748202491,5872698.34771906],[723250.508284339,5872761.5280976],
        [723286.16249158,5872815.86084868],[723315.028102666,5872830.77719621],
        [723502.328395902,5872819.6206505],[723518.483057357,5872818.65863173],
        [723567.82777813,5872844.15493286],[723749.413939088,5872937.98130854],
        [723848.429817139,5873019.41326079],[723893.228455684,5873056.25562596],
        [724000.782399525,5873179.05937195],[724022.179653074,5873203.48913931],
        [724167.213521721,5873219.79321866],[724240.443943894,5873257.62460164],
        [724345.033870514,5873311.65740904],[724427.033053176,5873354.0176493],
        [724458.116953997,5873354.38826826],[724601.342527281,5873356.09453768],
        [724659.368258544,5873356.78513641],[724699.259216658,5873263.86039926],
        [724734.038257937,5873182.84407915],[724769.196071982,5873148.4004069],
        [724792.808935311,5873125.2670227],[724828.594968331,5873107.84535952],
        [724909.660761314,5873068.37954232],[724968.429515518,5873010.80204763],
        [724969.116329931,5872952.53572905],[725027.883915669,5872894.95858978],
        [725144.902548535,5872823.50310579],[725202.982873244,5872824.19072548],
        [725231.165281494,5872845.9215328],[725260.549561619,5872868.5770444],
        [725323.492507265,5872998.67536266],[725345.617620278,5873044.40573114],
        [725374.316461685,5873073.88235996],[725461.097697554,5873104.044911],
        [725548.221016413,5873105.07306152],[725593.723206956,5873117.05713947],
        [725633.818030441,5873127.61507632],[725664.044374598,5873135.57621915],
        [725715.023293758,5873205.45921561],[725835.567474206,5873370.70034401],
        [725849.407491127,5873429.14029691],[725878.279489341,5873444.04917682],
        [725936.874293492,5873401.02996477],[725995.978527806,5873314.30901098],
        [726070.62161125,5873140.35732493],[726085.312084189,5873125.96087534],
        [726100.002508819,5873111.56442448],[726217.015284978,5873040.09276485],
        [726304.138055426,5873041.11333845],[726469.938970306,5873145.03456248]]]]}"""
        geo_dict = geojson.loads(multi_polygon_geojson)
        multi_polygon_loaded = shape(geo_dict)
        self.geo_model.geo_multi_polygon = multi_polygon_geojson
        self.assertTrue(
            self.geo_model.geo_multi_polygon.equals_exact(
                multi_polygon_loaded, tolerance=0.2
            )
        )

    def test_create_polygon_wkt_format(self):
        """Create a polygon"""
        polygon = """POLYGON((-95.80078125000001 40.09488212232117,
        -95.07568359375001 36.68604127658193,
        -90.439453125 37.80544394934273,-91.03271484375001 39.97712009843963,
        -95.80078125000001 40.09488212232117))"""
        polygon_loaded = wkt.loads(polygon)
        self.geo_model.geo_polygon = polygon
        self.assertTrue(
            self.geo_model.geo_polygon.equals_exact(polygon_loaded, tolerance=0.2)
        )

    def test_create_polygon_geojson_format(self):
        polygon_geojson = """{"type":"Polygon","coordinates":[[
        [-95.80078125000001,40.09488212232117],
        [-95.07568359375001,36.68604127658193],[-90.439453125,37.80544394934273],
        [-91.03271484375001,39.97712009843963],[-95.80078125000001,40.09488212232117]]]}"""
        geo_dict = geojson.loads(polygon_geojson)
        polygon_loaded = shape(geo_dict)
        self.geo_model.geo_polygon = polygon_geojson
        self.assertTrue(
            self.geo_model.geo_polygon.equals_exact(polygon_loaded, tolerance=0.2)
        )

    def test_create_line_wkt_format(self):
        """Create a line"""
        line = """LINESTRING(-98.81103515625001 38.97649248553944,
        -90.06591796875 38.99357205820945)"""
        self.geo_model.geo_line = line
        line_loaded = wkt.loads(line)
        self.assertTrue(
            self.geo_model.geo_line.equals_exact(line_loaded, tolerance=0.2)
        )

    def test_create_line_geosjon_format(self):
        line_geojson = """{"type":"LineString","coordinates":[
        [-98.81103515625001,38.97649248553944],
        [-90.06591796875,38.99357205820945]]}"""
        geo_dict = geojson.loads(line_geojson)
        line_loaded = shape(geo_dict)
        self.geo_model.geo_line = line_geojson
        self.assertTrue(
            self.geo_model.geo_line.equals_exact(line_loaded, tolerance=0.2)
        )

    def test_create_point_wkt_format(self):
        """Create a point"""
        point = "POINT(-99.2724609375 38.25543637637949)"
        self.geo_model.geo_point = point
        point_loaded = wkt.loads(point)
        self.assertTrue(
            self.geo_model.geo_point.equals_exact(point_loaded, tolerance=0.2)
        )

    def test_create_point_geosjon_format(self):
        point_geosjon = (
            '{ "type": "Point", "coordinates": [-99.2724609375, 38.25543637637949] }'
        )
        geo_dict = geojson.loads(point_geosjon)
        point_loaded = shape(geo_dict)
        self.geo_model.geo_point = point_geosjon
        self.assertTrue(
            self.geo_model.geo_point.equals_exact(point_loaded, tolerance=0.2)
        )

    def test_create_multi_line_wkt_format(self):
        """Create multiline"""
        multi_line = (
            "MULTILINESTRING ((10 10, 20 20, 10 40),(40 40, 30 30, 40 20, 30 10))"
        )
        self.geo_model.geo_multi_line = multi_line
        multi_line_loaded = wkt.loads(multi_line)
        self.assertTrue(
            self.geo_model.geo_multi_line.equals_exact(multi_line_loaded, tolerance=0.2)
        )

    def test_create_multi_line_geojson_format(self):
        multi_line_geojson = """{"type":"MultiLineString","coordinates":[[
            [10,10],[20,20],[10,40]],[[40,40],[30,30],[40,20],[30,10]]]}"""
        geo_dict = geojson.loads(multi_line_geojson)
        multi_line_loaded = shape(geo_dict)
        self.geo_model.geo_multi_line = multi_line_geojson
        self.assertTrue(
            self.geo_model.geo_multi_line.equals_exact(multi_line_loaded, tolerance=0.2)
        )

    def test_create_multi_point_wkt_format(self):
        """Create multipoint"""
        multi_point = "MULTIPOINT ((10 40), (40 30), (20 20), (30 10))"
        self.geo_model.geo_multi_point = multi_point
        multi_point_loaded = wkt.loads(multi_point)
        self.assertTrue(
            self.geo_model.geo_multi_point.equals_exact(
                multi_point_loaded, tolerance=0.2
            )
        )

    def test_create_multi_point_geosjson_format(self):
        multi_point_geojson = (
            '{"type":"MultiPoint","coordinates":[[10,40],[40,30],[20,20],[30,10]]}'
        )
        geo_dict = geojson.loads(multi_point_geojson)
        multi_point_loaded = shape(geo_dict)
        self.geo_model.geo_multi_point = multi_point_geojson
        self.assertTrue(
            self.geo_model.geo_multi_point.equals_exact(
                multi_point_loaded, tolerance=0.2
            )
        )

    def test_delete(self):
        self.geo_model.unlink()
        self.assertFalse(self.geo_model.exists())

    def test_search_intersect_for_zip_1169(self):
        retails = self.env["retail.machine"]
        zip_item = self.env["dummy.zip"].search([("name", "ilike", "1169")])
        result = retails.search([("the_point", "geo_intersect", zip_item.the_geom)])
        self.assertEqual(len(result.ids), 2)
        result = retails.search(
            [
                (
                    "the_point",
                    "geo_intersect",
                    {"dummy.zip.the_geom": [("id", "=", zip_item.id)]},
                )
            ]
        )
        self.assertEqual(len(result.ids), 2)

    def test_search_intersect_with_dict_id(self):
        retails = self.env["retail.machine"]
        result = retails.search(
            [
                (
                    "the_point",
                    "geo_intersect",
                    {"dummy.zip.the_geom": [("id", "in", ["1"])]},
                )
            ]
        )
        self.assertEqual(len(result.ids), 3)
        result = retails.search(
            [
                (
                    "the_point",
                    "geo_intersect",
                    {"dummy.zip.the_geom": [("id", "in", ["2"])]},
                )
            ]
        )
        self.assertEqual(len(result.ids), 2)
        result = retails.search(
            [
                (
                    "the_point",
                    "geo_intersect",
                    {"dummy.zip.the_geom": [("id", "in", ["1", "2"])]},
                )
            ]
        )
        self.assertEqual(len(result.ids), 5)

    def test_search_intersect_for_zip_1169_with_multiple_domain(self):
        retails = self.env["retail.machine"]
        result = retails.search(
            [
                (
                    "the_point",
                    "geo_intersect",
                    {
                        "dummy.zip.the_geom": [
                            ("id", "in", ["1", "2"]),
                            ("name", "ilike", "1169"),
                        ]
                    },
                )
            ]
        )
        self.assertEqual(len(result.ids), 2)

    def test_search_intersect_for_zip_1149(self):
        retails = self.env["retail.machine"]
        zip_item = self.env["dummy.zip"].search([("name", "ilike", "1146")])
        result = retails.search([("the_point", "geo_intersect", zip_item.the_geom)])
        self.assertEqual(len(result.ids), 3)

    def test_search_contains_for_retails_34(self):
        zip_item = self.env["dummy.zip"]
        retails = self.env["retail.machine"].search([("name", "=", "34")])
        result = zip_item.search([("the_geom", "geo_contains", retails.the_point)])

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Yens")

        result = zip_item.search(
            [
                (
                    "the_geom",
                    "geo_contains",
                    {"retail.machine.the_point": [("id", "=", retails.id)]},
                )
            ]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Yens")

    def test_search_contains_for_retails_21(self):
        zip_item = self.env["dummy.zip"]
        retails = self.env["retail.machine"].search([("name", "ilike", "21")])
        result = zip_item.search([("the_geom", "geo_contains", retails.the_point)])
        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Mollens (VD))")

    def test_search_within_for_retails_34(self):
        retails = self.env["retail.machine"]
        zip_item = self.env["dummy.zip"].search([("city", "ilike", "Yens")])
        result = retails.search(
            [("name", "ilike", "34"), ("the_point", "geo_within", zip_item.the_geom)]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.name, "34")

        result = retails.search(
            [
                ("name", "ilike", "34"),
                (
                    "the_point",
                    "geo_within",
                    {"dummy.zip.the_geom": [("id", "=", zip_item.id)]},
                ),
            ]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.name, "34")

    def test_search_within_for_retails_21(self):
        retails = self.env["retail.machine"]
        zip_item = self.env["dummy.zip"].search([("city", "ilike", "Mollens (VD))")])
        result = retails.search(
            [("name", "ilike", "21"), ("the_point", "geo_within", zip_item.the_geom)]
        )
        self.assertEqual(1, len(result))
        self.assertEqual(result.name, "21")

    def test_search_equals(self):
        zip_item = self.env["dummy.zip"].search([("city", "ilike", "Mollens (VD))")])

        result = zip_item.search(
            [
                (
                    "the_geom",
                    "geo_equal",
                    {"dummy.zip.the_geom": [("name", "ilike", "1146")]},
                ),
            ]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Mollens (VD))")

    def test_search_touch_polygon(self):
        zip_item = self.env["dummy.zip"]

        self.env["dummy.zip"].create(
            {
                "name": "10000",
                "city": "Poly1",
                "the_poly": "POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))",
            }
        )

        poly2 = self.env["dummy.zip"].create(
            {
                "name": "11000",
                "city": "Poly2",
                "the_poly": "POLYGON ((1 0, 1 1, 2 1, 2 0, 1 0))",
            }
        )
        result = zip_item.search([("the_poly", "geo_touch", poly2.the_poly)])

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Poly1")

        result = zip_item.search(
            [("the_poly", "geo_touch", {"dummy.zip.the_poly": [("id", "=", poly2.id)]})]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Poly1")

    def test_search_touch_multi_polygon(self):
        zip_item = self.env["dummy.zip"]
        self.env["dummy.zip"].create(
            {
                "name": "1192",
                "city": "Multi1",
                "the_geom": """MULTIPOLYGON (((0 0, 0 1, 1 1, 1 0, 0 0)),
                ((1 0, 1 1, 2 1, 2 0, 1 0)))""",
            }
        )

        multi_poly_2 = self.env["dummy.zip"].create(
            {
                "name": "6708",
                "city": "Multi2",
                "the_geom": """MULTIPOLYGON (((2 0, 2 1, 3 1, 3 0, 2 0)),
                ((3 0, 3 1, 4 1, 4 0, 3 0)))""",
            }
        )
        result = zip_item.search([("the_geom", "geo_touch", multi_poly_2.the_geom)])

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Multi1")

    def test_search_greater_multi_polygon(self):
        zip_item = self.env["dummy.zip"]
        mp1 = self.env["dummy.zip"].create(
            {
                "name": "1192",
                "city": "Mp1",
                "the_geom": """MULTIPOLYGON (((0 0, 0 5, 5 5, 5 0, 0 0)),
                ((1 1, 2 1, 2 2, 1 2, 1 1)), ((3 3, 4 3, 4 4, 3 4, 3 3)))""",
            }
        )

        self.env["dummy.zip"].create(
            {
                "name": "6708",
                "city": "Mp2",
                "the_geom": """MULTIPOLYGON (((-5 -5, -5 10, 10 10, 10 -5, -5 -5)),
                ((-4 -4, -3 -4, -3 -3, -4 -3, -4 -4)), ((6 6, 7 6, 7 7, 6 7, 6 6)))""",
            }
        )
        result = zip_item.search(
            [("city", "ilike", "Mp2"), ("the_geom", "geo_greater", mp1.the_geom)]
        )
        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Mp2")

        result = zip_item.search(
            [
                ("city", "ilike", "Mp2"),
                (
                    "the_geom",
                    "geo_greater",
                    {"dummy.zip.the_geom": [("id", "=", mp1.id)]},
                ),
            ]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Mp2")

    def test_search_lesser_multi_polygon(self):
        zip_item = self.env["dummy.zip"]
        self.env["dummy.zip"].create(
            {
                "name": "1192",
                "city": "Mp1",
                "the_geom": """MULTIPOLYGON (((0 0, 0 5, 5 5, 5 0, 0 0)),
                ((1 1, 2 1, 2 2, 1 2, 1 1)), ((3 3, 4 3, 4 4, 3 4, 3 3)))""",
            }
        )

        mp2 = self.env["dummy.zip"].create(
            {
                "name": "6708",
                "city": "Mp2",
                "the_geom": """MULTIPOLYGON (((-5 -5, -5 10, 10 10, 10 -5, -5 -5)),
                ((-4 -4, -3 -4, -3 -3, -4 -3, -4 -4)), ((6 6, 7 6, 7 7, 6 7, 6 6)))""",
            }
        )
        result = zip_item.search(
            [("city", "ilike", "Mp1"), ("the_geom", "geo_lesser", mp2.the_geom)]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Mp1")

        result = zip_item.search(
            [
                ("city", "ilike", "Mp1"),
                (
                    "the_geom",
                    "geo_lesser",
                    {"dummy.zip.the_geom": [("id", "=", mp2.id)]},
                ),
            ]
        )

        self.assertEqual(1, len(result))
        self.assertEqual(result.city, "Mp1")

    def test_from_lat_lon(self):
        latitude = 49.72842315886126
        longitude = 5.400488376617026

        # This is computed with postgis in postgres:

        expected_coordinates = [601179.61612, 6399375.681364]

        geo_point = GeoPoint.from_latlon(self.env.cr, latitude, longitude)

        self.assertAlmostEqual(geo_point.x, expected_coordinates[0], 4)
        self.assertAlmostEqual(geo_point.y, expected_coordinates[1], 4)

    def test_to_lat_lon(self):
        geo_point = '{ "type": "Point", "coordinates": [601179.61612, 6399375.681364] }'

        longitude, latitude = GeoPoint.to_latlon(self.env.cr, geo_point)

        self.assertAlmostEqual(latitude, 49.72842315886126, 4)
        self.assertAlmostEqual(longitude, 5.400488376617026, 4)

    def test_deprecated_geo_search__intersect_for_zip_1169(self):
        retails = self.env["retail.machine"]
        zip_item = self.env["dummy.zip"].search([("name", "ilike", "1169")])
        result = retails.geo_search(
            geo_domain=[("the_point", "geo_intersect", zip_item.the_geom)]
        )
        self.assertEqual(len(result), 2)

    def test_deprecated_geo_search__intersect_for_zip_1169_with_dict(self):
        retails = self.env["retail.machine"]
        zip_item = self.env["dummy.zip"].search([("name", "ilike", "1169")])
        result = retails.geo_search(
            geo_domain=[
                (
                    "the_point",
                    "geo_intersect",
                    {"dummy.zip.the_geom": [("id", "=", zip_item.id)]},
                )
            ]
        )
        self.assertEqual(len(result), 2)
