import contextlib
import logging
import warnings

from odoo.fields import Domain
from odoo.models import BaseModel
from odoo.orm import domains
from odoo.orm.domains import (
    CONDITION_OPERATORS,
    NEGATIVE_CONDITION_OPERATORS,
    SQL,
    DomainCondition,
    OptimizationLevel,
    Query,
)
from odoo.orm.identifiers import NewId

_logger = logging.getLogger(__name__)

GEO_OPERATORS = frozenset(
    [
        "geo_greater",
        "geo_lesser",
        "geo_equal",
        "geo_touch",
        "geo_within",
        "geo_contains",
        "geo_intersect",
    ]
)


def checked(self) -> DomainCondition:
    """Validate `self` and return it if correct, otherwise raise an exception."""
    if not isinstance(self.field_expr, str) or not self.field_expr:
        self._raise("Empty field name", error=TypeError)
    operator = self.operator.lower()
    if operator != self.operator:
        warnings.warn(
            (
                f"Deprecated since 19.0, the domain condition "
                f"{(self.field_expr, self.operator, self.value)!r} "
                f"should have a lower-case operator"
            ),
            DeprecationWarning,
            # <MOD>
            stacklevel=2,
            # </MOD>
        )
        return DomainCondition(self.field_expr, operator, self.value).checked()
    if operator not in CONDITION_OPERATORS:
        # <MOD>
        if operator not in GEO_OPERATORS:
            # </MOD>
            self._raise("Invalid operator")

    # check already the consistency for domain manipulation
    # these are common mistakes and optimizations,
    # do them here to avoid recreating the domain
    # - NewId is not a value
    # - records are not accepted, use values
    # - Query and Domain values should be using a relational operator
    # <MOD>
    # from .models import BaseModel  # noqa: PLC0415
    # </MOD>

    value = self.value
    if value is None:
        value = False
    elif isinstance(value, NewId):
        _logger.warning(
            "Domains don't support NewId, use .ids instead, for %r",
            (self.field_expr, self.operator, self.value),
        )
        operator = "not in" if operator in NEGATIVE_CONDITION_OPERATORS else "in"
        value = []
    elif isinstance(value, BaseModel):
        _logger.warning(
            "The domain condition %r should not have a value which is a model",
            (self.field_expr, self.operator, self.value),
        )
        value = value.ids
    elif isinstance(value, (Domain, Query, SQL)) and operator not in (
        "any",
        "not any",
        "any!",
        "not any!",
        "in",
        "not in",
    ):
        # accept SQL object in the right part for simple operators
        # use case: compare 2 fields
        _logger.warning(
            "The domain condition %r should use the 'any' or 'not any' operator.",
            (self.field_expr, self.operator, self.value),
        )
    if value is not self.value:
        return DomainCondition(self.field_expr, operator, value)
    return self


def _to_sql(self, model: BaseModel, alias: str, query: Query) -> SQL:
    """Enhanced _to_sql that handles geospatial operators."""
    field_expr, operator, value = self.field_expr, self.operator, self.value

    # Only handle geospatial operators here, delegate everything else to original method
    if operator in GEO_OPERATORS:
        # Ensure geospatial conditions are fully optimized
        assert self._opt_level >= OptimizationLevel.FULL, (
            "Must fully optimize before generating the query "
            f"{(field_expr, operator, value)}"
        )

        field = self._field(model)
        model._check_field_access(field, "read")
        return field.condition_to_sql(field_expr, operator, value, model, alias, query)

    # For all other operators, use the original method
    return original__to_sql(self, model, alias, query)


def _optimize_step(self, model: BaseModel, level: OptimizationLevel) -> Domain:
    """Optimization step for geospatial operators."""
    # For geospatial operators, we need to handle them specially during optimization
    # If this is a geospatial operator, mark it as optimized at FULL level
    if self.operator in GEO_OPERATORS:
        # Perform basic validation and normalization
        with contextlib.suppress(Exception):
            field = self._field(model)
            # Basic geospatial operator validation
            if hasattr(field, "geo_type"):  # It's a geospatial field
                # Create optimized version with FULL level
                optimized = DomainCondition(self.field_expr, self.operator, self.value)
                object.__setattr__(optimized, "_opt_level", OptimizationLevel.FULL)
                return optimized

    # Fall back to original optimization for non-geo operators
    return original__optimize_step(self, model, level)


# Store original methods before monkey patching
original__optimize_step = DomainCondition._optimize_step
original__to_sql = DomainCondition._to_sql

DomainCondition.checked = checked
DomainCondition._to_sql = _to_sql
DomainCondition._optimize_step = _optimize_step

domains.CONDITION_OPERATORS = domains.CONDITION_OPERATORS.union(GEO_OPERATORS)
