from odoo import fields, models


class GeoModelTest(models.Model):
    _name = "geo.model.test"
    name = fields.Char("GeoModelTest")
    geo_multi_polygon = fields.GeoMultiPolygon()
    geo_polygon = fields.GeoPolygon()
    geo_line = fields.GeoLine()
    geo_point = fields.GeoPoint()
    geo_multi_line = fields.GeoMultiLine()
    geo_multi_point = fields.GeoMultiPoint()


class DummyZip(models.Model):
    _name = "dummy.zip"
    _description = "Geoengine demo ZIP"

    name = fields.Char("ZIP", index=True, required=True)
    city = fields.Char(index=True, required=True)
    the_geom = fields.GeoMultiPolygon("NPA Shape")
    the_poly = fields.GeoPolygon()


class RetailMachine(models.Model):
    _name = "retail.machine"
    _description = "Geoengine demo retailing machine"

    the_point = fields.GeoPoint("Coordinate")
    total_sales = fields.Float("Total sale", index=True)
    money_level = fields.Char(index=True)
    state = fields.Selection([("hs", "HS"), ("ok", "OK")], index=True)
    name = fields.Char("Serial number", required=True)
