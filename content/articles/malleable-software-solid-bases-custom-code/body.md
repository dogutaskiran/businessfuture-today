Software teams often face a false choice: buy standardized tools and accept their constraints, or build everything from scratch and inherit the maintenance burden. A newly shared essay, **“Malleable software = solid bases and custom code,”** puts the tension in more useful terms.

Its title points to a model in which software should be adaptable without being fragile: organizations need solid bases, alongside the ability to write custom code where their work genuinely differs.

The post was submitted to Hacker News, where it had 60 points and 21 comments at the time reflected in the source material. The source summary does not provide further detail on the essay’s proposed architecture or examples, but the framing is relevant to a broad set of technology decisions.

## The operating question behind “malleable”

For executives and operators, malleability is not simply a developer preference. It is the ability to change workflows, data handling and business logic as the company changes—without turning every change into a vendor request, a spreadsheet workaround or a risky rewrite.

A solid base can provide the parts that benefit from consistency: shared data, permissions, reliability, integration patterns and core workflows. Custom code can then be reserved for the parts that encode a company’s specific processes or differentiators.

That division matters because customization is neither automatically good nor automatically bad. A bespoke feature can be valuable when it captures a process that is central to how a business competes. The same feature can be costly when it merely recreates a commodity capability already available in a stable product or platform.

## What builders should clarify

The phrase “solid bases and custom code” is a useful decision framework, but it requires teams to define both sides of the boundary.

Before extending a system, teams should ask:

- Which workflow is truly specific to the business?
- Which data and permission rules must remain consistent across teams?
- Who will own the custom code after launch?
- Can the customization survive upgrades, personnel changes and new integrations?
- Is the underlying platform designed to expose the interfaces the customization needs?

These questions help distinguish a deliberate extension from a workaround that will become a long-term dependency.

## Avoiding the two common traps

The first trap is over-standardization. A team can adopt a polished off-the-shelf system and then discover that important work happens outside it because the product cannot accommodate real exceptions. The result is often fragmented processes rather than operational simplicity.

The second is over-customization. When every team gets a unique implementation, the organization can lose shared visibility and make future changes more expensive. Custom logic also creates an ownership obligation: code needs testing, documentation, security review and maintenance.

Malleability, in this sense, depends on constraints. The base must be dependable enough that extensions do not compromise core operations. The extension mechanism must be clear enough that customization does not require bypassing the system altogether.

## What to watch next

The useful next step is to look beyond whether a vendor advertises “customization.” Buyers and builders should examine where customization lives, what it can access, how it is governed and whether it can be tested and maintained like other production software.

For software leaders, the central takeaway is straightforward: standardize the foundations that should be shared, and make deliberate investments in custom code where the business needs room to change. The value is not maximum flexibility. It is controlled adaptability.
