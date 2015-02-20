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
"""Helper to setup Postgis"""
from openerp.osv import osv
from openerp.tools.translate import _

import logging

logger = logging.getLogger('geoengine.sql')


def init_postgis(cursor):
    """ Initialize postgis
    """
    cursor.execute("""
        SELECT
            tablename
        FROM
            pg_tables
        WHERE
            tablename='spatial_ref_sys';
    """)
    check = cursor.fetchone()
    if check:
        return {}
    try:
        cursor.execute("""
        CREATE EXTENSION postgis;
        CREATE EXTENSION postgis_topology;
    """)
    except Exception, exc:
        raise osv.except_osv(
            _('Error, Can not initialize spatial postgis function.'
              ' Database user may have to be superuser and postgres/postgis '
              'extentions and dev header have to be installed'), str(exc))
