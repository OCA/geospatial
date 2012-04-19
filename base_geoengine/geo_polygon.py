# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from __future__ import absolute_import 
from osv import fields
from . import geo_field

class GeoPolygon(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry Polygon type"""
    _type = 'geo_polygon'

    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoPolygon, self).__init__(string, "POLYGON", **args)
        return res

fields.geo_polygon = GeoPolygon
