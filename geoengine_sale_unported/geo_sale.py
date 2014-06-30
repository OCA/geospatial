# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
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

