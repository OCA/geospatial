# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
"""Helper to setup Postgis"""
import logging

from odoo.exceptions import MissingError

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
