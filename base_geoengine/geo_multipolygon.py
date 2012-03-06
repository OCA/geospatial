# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv, orm
from . import geo_field

class GeoMultiPolygon(geo_field.Geom):
    """This class adds a new type of columns to ORM. It enables POSTGIS geometry type support"""
    _type = 'geo_multi_polygon'
    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoMultiPolygon, self).__init__(string, "MULTIPOLYGON", **args)
        return res

fields.geo_multi_polygon = GeoMultiPolygon
