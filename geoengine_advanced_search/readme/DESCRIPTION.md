Search geo fields inline in the search bar, with the spatial operators of
geoengine instead of the standard ones.

A condition on a geo field offers *intersects*, *is within*, *contains*,
*touches*, *is geometrically equal to*, *has a larger area than* and *has a
smaller area than* (also negated), plus *is set* / *is not set*.

The value of such a condition is either a geometry (WKT or GeoJSON), or the
records of another model picked through one of its geo fields, e.g.

``Address coordinates`` *is within* ``Contact > geom Grenzen``
``Oberösterreich``

The records can be picked directly or filtered with a sub-domain. The search
facets describe these conditions with their operator and value.
