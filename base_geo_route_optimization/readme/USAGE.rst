This module does not provide a result on its own. It provides an
abstract class that must be extended by any model you wish to route. For
example, a list of partners.

* The `prepare_destinations` method should be extended to return
  a list of strings that are compatible with the request parameters outlined at
  <https://developers.google.com/maps/documentation/directions/intro#RequestParameters>
* You must then call `optimize_route` with a recordset you wish to sort. An
  origin string must be provided as a parameter from which the route starts.
