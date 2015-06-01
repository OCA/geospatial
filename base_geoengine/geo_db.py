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
from openerp.exceptions import MissingError

import logging

logger = logging.getLogger('geoengine.sql')


def init_postgis(cr):
    """ Initialize postgis
    Add PostGIS support to the database. PostGIS is a spatial database
    extender for PostgreSQL object-relational database. It adds support for
    geographic objects allowing location queries to be run in SQL.
    """
    cr.execute("""
        SELECT
            tablename
        FROM
            pg_tables
        WHERE
            tablename='spatial_ref_sys';
    """)
    check = cr.fetchone()
    if check:
        return {}
    try:
        cr.execute("""
        CREATE EXTENSION postgis;
        CREATE EXTENSION postgis_topology;
    """)
    except Exception:
        raise MissingError(
            "Error, can not automatically initialize spatial postgis support. "
            "Database user may have to be superuser and postgres/postgis "
            "extentions with their devel header have to be installed. "
            "If you do not want Odoo to connect with a super user "
            "you can manually prepare your database. To do this"
            "open a client to your database using a super user and run: \n"
            "CREATE EXTENSION postgis;\n"
            "CREATE EXTENSION postgis_topology;\n"
        )
