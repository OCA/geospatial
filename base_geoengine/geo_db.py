# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
"""Helper to setup Postgis"""
import logging

from odoo import _
from odoo.exceptions import MissingError
from odoo.tools import sql

logger = logging.getLogger("geoengine.sql")
_schema = logging.getLogger("odoo.schema")


def init_postgis(cr):
    """Initialize postgis
    Add PostGIS support to the database. PostGIS is a spatial database
    extender for PostgreSQL object-relational database. It adds support for
    geographic objects allowing location queries to be run in SQL.
    """
    cr.execute(
        """
        SELECT
            tablename
        FROM
            pg_tables
        WHERE
            tablename='spatial_ref_sys';
    """
    )
    check = cr.fetchone()
    if check:
        return {}
    try:
        cr.execute(
            """
        CREATE EXTENSION postgis;
        CREATE EXTENSION postgis_topology;
    """
        )
    except Exception:
        raise MissingError(
            _(
                "Error, can not automatically initialize spatial postgis"
                " support. Database user may have to be superuser and"
                " postgres/postgis extensions with their devel header have"
                " to be installed. If you do not want Odoo to connect with a"
                " super user you can manually prepare your database. To do"
                " this, open a client to your database using a super user and"
                " run:\n"
                "CREATE EXTENSION postgis;\n"
                "CREATE EXTENSION postgis_topology;\n"
            )
        )


def create_geo_column(cr, tablename, columnname, geotype, srid, dim, comment=None):
    """Create a geometry column with the given type.

    :params: srid: geometry's projection srid
    :params: dim: geometry's dimension (2D or 3D)
    """
    cr.execute(
        "SELECT AddGeometryColumn( %s, %s, %s, %s, %s)",
        (tablename, columnname, srid, geotype, dim),
    )
    if comment:
        # pylint: disable=E8103
        cr.execute(
            'COMMENT ON COLUMN "{}"."{}" IS %s'.format(tablename, columnname),
            (comment,),
        )
    _schema.debug(
        "Table %r: added geometry column %r of type %s", tablename, columnname, geotype
    )


def _postgis_index_name(table, col_name):
    return "{}_{}_gist_index".format(table, col_name)


def create_geo_index(cr, columnname, tablename):
    """Create the given index unless it exists."""
    indexname = _postgis_index_name(tablename, columnname)
    if sql.index_exists(cr, indexname):
        return
    # pylint: disable=E8103
    cr.execute(
        "CREATE INDEX {} ON {} USING GIST ( {} )".format(
            indexname, tablename, columnname
        )
    )
    _schema.debug("Table %r: created index %r", tablename, indexname)
