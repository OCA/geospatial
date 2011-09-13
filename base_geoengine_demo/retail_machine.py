#-*- coding: utf-8 -*-
##############################################################################
#
# Copyright (c) 2010 Camptocamp SA (http://www.camptocamp.com)
# All Right Reserved
#
##############################################################################
from osv import fields, osv

from base_geoengine import geo_model

class RetailMachine(geo_model.GeoModel):
    """GEO OSV SAMPLE"""

    _name = "geoengine.demo.automatic.retailing.machine"
    _columns = {'the_point' : fields.geo_point('Coordinate'),
                'total_sales': fields.float('Total sale'),
                'money_level': fields.char('Money level', size=32),
                'state': fields.selection([('hs', 'HS'), ('ok', 'OK')],'State'),
                'name': fields.char('Serial number', size=64, required=True)}
RetailMachine()
