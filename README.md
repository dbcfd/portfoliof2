# Client Side Portfolio Management #
This is a set of javascript and html pages to manage portfolios on the client side, provided quotes and a database are available via REST/JSON.

## Database Setup ##
If you do not wish to setup a server that can handle REST/JSON for database queries, RavenDB can be used. RavenDB will have to be configured with the following:
 * Two databases, prices and pf2
 * An index in pf2 called documentsByType with the following query:

    from doc in docs
    where doc.ObjectType=="Portfolio"
    select new {User=doc.User,Name=doc.Name,Type=doc.Type,CashBalance=doc.CashBalance,CostBasis=doc.CostBasis,Quantity=doc.Quantity}
    
 * Configuration to allow AccessControlAllowOrigin (if testing in localhost), and read/write access
 
    <add key="Raven/AnonymousAccess" value="All"/>
	<add key="Raven/AccessControlAllowOrigin" value="*"/>

Configuration keys must be added to Raven.Server.exe.config prior to launching Raven.Server.exe