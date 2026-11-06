# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import logging
import random
import string

from odoo import fields
from odoo.fields import Domain
from odoo.models import BaseModel
from odoo.tools import SQL, Query

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
    field_expr: str,
    operator: str,
    value,
    model: BaseModel,
    alias: str,
    query: Query,
) -> SQL:
    """
    This method has been monkey patched in order to be able to include
    geo_operators into the Odoo search method.
    """
    if operator in GEO_OPERATORS.keys():
        current_field = model._fields.get(field_expr)
        current_operator = GeoOperator(current_field)
        if current_field and isinstance(current_field, GeoField):
            params = []
            if isinstance(value, dict):
                # We are having indirect geo_operator like (‘geom’, ‘geo_...’,
                # {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })
                ref_search = value
                sub_queries = []
                for key in ref_search:
                    i = key.rfind(".")
                    rel_model_name = key[0:i]
                    rel_col = key[i + 1 :]
                    rel_model = model.env[rel_model_name]
                    # we compute the attributes search on spatial rel
                    if ref_search[key]:
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
                        # Record rules (ir.rule) on the related model are applied
                        # inside where_calc(), mirroring BaseModel._search().
                        if operator == "geo_equal":
                            rel_query.add_where(
                                f'"{alias}"."{field_expr}" {GEO_OPERATORS[operator]} '
                                f"{rel_alias}.{rel_col}"
                            )
                        elif operator in ("geo_greater", "geo_lesser"):
                            rel_query.add_where(
                                f"ST_Area({alias}.{field_expr}) "
                                f"{GEO_OPERATORS[operator]} "
                                f"ST_Area({rel_alias}.{rel_col})"
                            )
                        else:
                            rel_query.add_where(
                                f'{GEO_OPERATORS[operator]}("{alias}"."{field_expr}", '
                                f"{rel_alias}.{rel_col})"
                            )

                        subquery_sql = rel_query.subselect("1")
                        sub_query_mogrified = (
                            model.env.cr.mogrify(subquery_sql.code, subquery_sql.params)
                            .decode("utf-8")
                            .replace(f"'{rel_model._table}'", f'"{rel_model._table}"')
                            .replace("%", "%%")
                        )
                        sub_queries.append(f"EXISTS({sub_query_mogrified})")
                query_str = " AND ".join(sub_queries)
            else:
                query_str = get_geo_func(
                    current_operator, operator, field_expr, value, params, model._table
                )
            return SQL(query_str, *params)
    return original___condition_to_sql(
        self,
        field_expr=field_expr,
        operator=operator,
        value=value,
        model=model,
        alias=alias,
        query=query,
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
    applies record rules (``ir.rule``) to the resulting query. This matters for
    the indirect geo-operators, whose spatial sub-query is built here: without
    it, the sub-query would match related records the user is not allowed to
    read (row-level security bypass).
    """
    # if the object has an active field ('active', 'x_active'), filter out all
    # inactive records unless they were explicitly asked for
    if model._active_name and active_test and model._context.get("active_test", True):
        # the item[0] trick below works for domain items and '&'/'|'/'!'
        # operators too
        if not any(item[0] == model._active_name for item in domain):
            domain = [(model._active_name, "=", 1)] + domain

    query = Query(model.env, alias, model._table)
    if domain:
        # In Odoo 19, create Domain object and use its _to_sql method
        domain_obj = Domain(domain)
        optimized_domain = domain_obj.optimize_full(model)
        sql_condition = optimized_domain._to_sql(model, alias, query)
        query.add_where(sql_condition)

    # Apply record rules, like BaseModel._search does. Skipped for the
    # superuser (env.su), exactly as in core.
    if not model.env.su:
        model.browse().check_access("read")
        model_sudo = model.sudo().with_context(active_test=False)
        sec_domain = model.env["ir.rule"]._compute_domain(model._name, "read")
        sec_domain = sec_domain.optimize_full(model_sudo)
        if sec_domain.is_false():
            query.add_where(SQL("FALSE"))
        elif not sec_domain.is_true():
            query.add_where(sec_domain._to_sql(model_sudo, alias, query))

    return query
