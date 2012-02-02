# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################

from osv import fields, osv

from base_geoengine import geo_model

class SaleOrder(geo_model.GeoModel):
    """Add geo_point to sale.order"""
    _name = "sale.order"
    _inherit = "sale.order"
    _columns = {'geo_point' : fields.geo_related('partner_invoice_id',
                                                 'geo_point',
                                                 string='Sale order coordinate',
                                                 type='geo_point',
                                                 relation='res.partner.address',
                                                 dim=2, # mandatory arg
                                                 srid=900913)}# mandatory arg
SaleOrder()