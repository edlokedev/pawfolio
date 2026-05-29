# Pawfolio Context

Domain glossary only. No implementation detail.

## Terms

- Pawfolio: Personal pet health tracking app for three cats.
- Cat-Friendly Tone: Warm, cute, softly playful, and clearly cat-oriented without becoming childish or cartoon-heavy.
- Cat: Pet whose health records are tracked in Pawfolio.
- Cat Identity: Stable profile facts about a cat, such as name, photo, sex, age, breed, color, microchip, insurance, and vet contact.
- Placeholder Cat Image: Temporary cat image used until real photo upload exists.
- Health Record: Dated information about a cat's health or care.
- Vet Visit: Health record for a cat's veterinary appointment.
- Medication Event: Health record showing medicine was given to a cat.
- Weight Measurement: Health record showing a cat's body weight at a point in time.
- Add Record: Action for creating a new Health Record for a cat.
- Pawfolio Data: JSON-backed cat and health record data owned by the Pawfolio backend.
- Cat File: JSON file containing one cat's identity, due items, and health records.
- Overview: Main Pawfolio view showing all tracked cats at once.
- Read-Only Overview: Overview visible without edit permissions.
- Public Summary: Cat Card information safe to show without owner unlock.
- Cat Card: Summary of one cat on the Overview.
- Alert Chip: Subtle Cat Card indicator for overdue or important care items.
- Due Item: Manually tracked care item with a date, shown when due or overdue.
- Cat Profile: Full detail view for one cat, including health records and history.
- Cat Profile Edit: Protected Record Change for updating Cat Identity or the cat's profile photo.
- Vitals: Cat Profile section for measurements such as weight.
- Timeline: Chronological list of a cat's Health Records.
- Medication Log: Cat Profile area for tracking medicine given over time.
- Vomit Event: Health record showing a cat vomited.
- Hairball: Vomit Event cause/type when vomit is hair-related.
- Note: Freeform health or care detail attached to a cat or health record.
- Record Photo: Image attached to a Health Record.
- Protected Record Change: Adding, editing, or deleting Pawfolio data, allowed only after account or unlock check.
- Owner Unlock Code: Shared secret used to allow Protected Record Changes.
