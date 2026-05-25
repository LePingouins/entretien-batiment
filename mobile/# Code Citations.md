# Code Citations

## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dL
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/marturi/Spokes/blob/3ce91e6d3f8c68ee188b8fa56113dfd857b90425/SpokesCore/SpokesCore_Web/JavaSource/main/net/oitobstudio/spokes/route/BookendRouteSegment.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```


## License: unknown
https://github.com/mbell697/bosrouter/blob/addef6dfbd88bc59cd9518b309fa57430974718c/bosrouter/src/main/java/com/bosrouter/geo/GeoMath.java

```
It uses the **Haversine formula** — a standard method to calculate the straight-line distance between two GPS coordinates on Earth's surface.

**When it runs:** automatically on the backend when you end a trip (`status → COMPLETED`) and both start + end coordinates are available.

The code is in [backend/.../model/RepTrip.java](backend/src/main/java/com/entretienbatiment/backend/modules/reptrips/model/RepTrip.java):

```java
public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    final double R = 6371.0; // Earth radius in km
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat/2) * Math.sin(dLat/2)
             + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
             * Math.sin(dLng/2) * Math.sin(dLng/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10
```

