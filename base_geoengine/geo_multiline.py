# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields
from . import geo_field

class GeoMultiLine(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry MultiLine type"""
    _type = 'geo_multi_line'

    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoMultiLine, self).__init__(string, "MULTILINESTRING", **args)
        return res

fields.geo_multi_line = GeoMultiLine
