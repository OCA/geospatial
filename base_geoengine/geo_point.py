# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv, orm
from . import geo_field

class GeoPoint(geo_field.Geom):
    """This class add a new type of columns to ORM it enable POSTGIS geometry type support"""
    _type = 'geo_point'
    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoPoint, self).__init__(string, "POINT", **args)
        return res
        
fields.geo_point = GeoPoint
