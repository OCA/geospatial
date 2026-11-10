# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import logging
import random
import string

from odoo import fields
from odoo.fields import Domain
from odoo.models import BaseModel
from odoo.orm.query import Query, TableSQL
from odoo.tools import SQL

from .fields import GeoField
from .geo_operators import GeoOperator

logger = logging.getLogger(__name__)

original___condition_to_sql = fields.Field._condition_to_sql

GEO_OPERATORS = {
    "geo_greater": ">",
    "geo_lesser": "<",
    "geo_equal": "=",
    "geo_touch": "ST_Touches",
    "geo_within": "ST_Within",
    "geo_contains": "ST_Contains",
    "geo_intersect": "ST_Intersects",
}

GEO_SQL_OPERATORS = {
    "geo_greater": SQL(">"),
    "geo_lesser": SQL("<"),
    "geo_equal": SQL("="),
    "geo_touch": SQL("ST_Touches"),
    "geo_within": SQL("ST_Within"),
    "geo_contains": SQL("ST_Contains"),
    "geo_intersect": SQL("ST_Intersects"),
}


def _condition_to_sql(
    self,
    table: TableSQL,
    field_expr: str,
    operator: str,
    value,
) -> SQL:
    """
    This method has been monkey patched in order to be able to include
    geo_operators into the Odoo search method.
    """
    model: BaseModel = table._model
    alias = table._alias
    if operator in GEO_OPERATORS:
        current_field = model._fields.get(field_expr)
        current_operator = GeoOperator(current_field)
        if current_field and isinstance(current_field, GeoField):
            params = []
            if isinstance(value, dict):
                # We are having indirect geo_operator like (‘geom’, ‘geo_...’,
                # {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })
                ref_search = value
                if not ref_search:
                    raise ValueError(
                        f"Missing geo reference for {field_expr!r}: expected "
                        f"{{'<model>.<geo field>': <domain>}}"
                    )
                sub_queries = []
                for key in ref_search:
                    i = key.rfind(".")
                    rel_model_name = key[0:i]
                    rel_col = key[i + 1 :]
                    if rel_model_name not in model.env or not isinstance(
                        model.env[rel_model_name]._fields.get(rel_col), GeoField
                    ):
                        raise ValueError(
                            f"Invalid geo reference {key!r}: expected "
                            f"'<model>.<geo field>'"
                        )
                    rel_model = model.env[rel_model_name]
                    # we compute the attributes search on spatial rel
                    rel_alias = (
                        rel_model._table
                        + "_"
                        + "".join(random.choices(string.ascii_lowercase, k=5))
                    )
                    rel_query = where_calc(
                        rel_model,
                        ref_search[key],
                        active_test=True,
                        alias=rel_alias,
                    )
                    # Access rights and record rules (ir.access) on the related
                    # model are applied inside where_calc(), mirroring
                    # BaseModel._search().
                    left_sql = SQL.identifier(alias, field_expr)
                    right_sql = SQL.identifier(rel_alias, rel_col)
                    sql_operator = GEO_SQL_OPERATORS[operator]
                    if operator == "geo_equal":
                        rel_query.add_where(
                            SQL("%s %s %s", left_sql, sql_operator, right_sql)
                        )
                    elif operator in ("geo_greater", "geo_lesser"):
                        rel_query.add_where(
                            SQL(
                                "ST_Area(%s) %s ST_Area(%s)",
                                left_sql,
                                sql_operator,
                                right_sql,
                            )
                        )
                    else:
                        rel_query.add_where(
                            SQL("%s(%s, %s)", sql_operator, left_sql, right_sql)
                        )

                    sub_queries.append(SQL("EXISTS(%s)", rel_query.subselect(SQL("1"))))
                return SQL(" AND ").join(sub_queries)
            query_str = get_geo_func(
                current_operator, operator, field_expr, value, params, alias
            )
            return SQL(query_str, *params)
    return original___condition_to_sql(
        self,
        table=table,
        field_expr=field_expr,
        operator=operator,
        value=value,
    )


fields.Field._condition_to_sql = _condition_to_sql


def get_geo_func(current_operator, operator, left, value, params, table):
    """
    This method will call the SQL query corresponding to the requested geo operator
    """
    match operator:
        case "geo_greater":
            query = current_operator.get_geo_greater_sql(table, left, value, params)
        case "geo_lesser":
            query = current_operator.get_geo_lesser_sql(table, left, value, params)
        case "geo_equal":
            query = current_operator.get_geo_equal_sql(table, left, value, params)
        case "geo_touch":
            query = current_operator.get_geo_touch_sql(table, left, value, params)
        case "geo_within":
            query = current_operator.get_geo_within_sql(table, left, value, params)
        case "geo_contains":
            query = current_operator.get_geo_contains_sql(table, left, value, params)
        case "geo_intersect":
            query = current_operator.get_geo_intersect_sql(table, left, value, params)
        case _:
            raise NotImplementedError(f"The operator {operator} is not supported")
    return query


def where_calc(model, domain, active_test=True, alias=None):
    """
    This method is copied from base, we need to create our own query.

    It mirrors ``BaseModel._search``: besides ``active_test`` filtering, it also
    applies access rights and record rules (``ir.access``) to the resulting
    query. This matters for the indirect geo-operators, whose spatial
    sub-query is built here: without it, the sub-query would match related
    records the user is not allowed to read (row-level security bypass).
    """
    # if the object has an active field ('active', 'x_active'), filter out all
    # inactive records unless they were explicitly asked for
    # the item[0] trick below works for domain items and '&'/'|'/'!'
    # operators too
    if (
        model._active_name
        and active_test
        and model.env.context.get("active_test", True)
        and not any(item[0] == model._active_name for item in domain)
    ):
        domain = [(model._active_name, "=", True)] + domain

    # Apply access rights and record rules, like BaseModel._search does.
    # Skipped for the superuser (env.su), exactly as in core.
    if model.env.su:
        sec_domain = Domain.TRUE
    else:
        sec_domain = model._access_domain("read")
        if sec_domain.is_false():
            model.browse().check_access("read")

    domain_obj = Domain(domain).optimize_full(model)

    query = Query(model, alias)
    if not domain_obj.is_true():
        query.add_where(domain_obj._to_sql(query.table))

    if not sec_domain.is_true():
        model_sudo = model.sudo().with_context(active_test=False)
        sec_domain = sec_domain.optimize_full(model_sudo, search_domain=domain_obj)
        if sec_domain.is_false():
            query.add_where(SQL("FALSE"))
        elif not sec_domain.is_true():
            query.add_where(sec_domain._to_sql(query.table._with_model(model_sudo)))

    return query
