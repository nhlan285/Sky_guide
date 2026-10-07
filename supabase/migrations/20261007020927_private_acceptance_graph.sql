-- Immutable private canonical graph metadata, not full module payload history.
-- No seed/grant/reviewer authentication/public pointer/new runtime driver.
-- Insert acceptance, children, then header; force deferred constraints before commit.
-- SHA covers JSON.stringify({identities:validatedGraph,provenanceIds}) in the
-- server codec. SQL validates structure/counts/order, NOT that JS byte digest.
create table sky_private.acceptance_graph (
 acceptance_revision bigint primary key references sky_private.sync_acceptance(revision) on update restrict on delete restrict deferrable initially deferred,
 graph_sha256 text not null check(graph_sha256 ~ '^[a-f0-9]{64}$'),
 identity_count bigint not null check(identity_count between 0 and 9007199254740991),
 identity_provenance_count bigint not null check(identity_provenance_count between 0 and 9007199254740991),
 candidate_provenance_count bigint not null check(candidate_provenance_count between 0 and 9007199254740991),
 crosswalk_count bigint not null check(crosswalk_count between 0 and 9007199254740991),
 alias_count bigint not null check(alias_count between 0 and 9007199254740991),
 tombstone_count bigint not null check(tombstone_count between 0 and 9007199254740991),
 relation_count bigint not null check(relation_count between 0 and 9007199254740991)
);
create table sky_private.graph_provenance (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,provenance_id text not null references sky_private.provenance(id) on update restrict on delete restrict,position integer not null check(position>=0),
 primary key(acceptance_revision,provenance_id),unique(acceptance_revision,position)
);
create index graph_provenance_evidence_idx on sky_private.graph_provenance(provenance_id);
create table sky_private.graph_identity (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,kind text not null check(kind in('item','spirit','season','location','cosmetic','event','eventRule','eventOverride','eventOccurrence','sampleSet','instrument','emote','call','media')),id text not null check(length(btrim(id))>0),
 revision bigint not null check(revision between 1 and 9007199254740991),schema_version integer not null check(schema_version=1),
 updated_at text not null check(sky_private.iso_instant(updated_at) is not null),
 retired_at text check(retired_at is null or sky_private.valid_time_range(true,retired_at,'instant',true,updated_at,'instant')),
 fixture boolean not null,position integer not null check(position>=0),primary key(acceptance_revision,kind,id),unique(acceptance_revision,position)
);
create table sky_private.graph_identity_provenance (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,kind text not null,id text not null,provenance_id text not null,position integer not null check(position>=0),
 primary key(acceptance_revision,kind,id,provenance_id),unique(acceptance_revision,kind,id,position),
 foreign key(acceptance_revision,kind,id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,provenance_id) references sky_private.graph_provenance(acceptance_revision,provenance_id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_identity_provenance_evidence_idx on sky_private.graph_identity_provenance(acceptance_revision,provenance_id);
create table sky_private.graph_crosswalk (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,source_id text not null references sky_private.source_registry(id) on update restrict on delete restrict,
 kind text not null,source_key text not null check(length(btrim(source_key))>0),target_id text not null,position integer not null check(position>=0),
 primary key(acceptance_revision,source_id,kind,source_key),unique(acceptance_revision,position),
 foreign key(acceptance_revision,kind,target_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_crosswalk_source_idx on sky_private.graph_crosswalk(source_id);
create index graph_crosswalk_target_idx on sky_private.graph_crosswalk(acceptance_revision,kind,target_id);
create table sky_private.graph_alias (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,kind text not null check(kind in('item','spirit','season','location','cosmetic','event','eventRule','eventOverride','eventOccurrence','sampleSet','instrument','emote','call','media')),from_id text not null check(length(btrim(from_id))>0),
 target_identity_id text,target_alias_id text,position integer not null check(position>=0),check(num_nonnulls(target_identity_id,target_alias_id)=1),
 primary key(acceptance_revision,kind,from_id),unique(acceptance_revision,position),
 foreign key(acceptance_revision,kind,target_identity_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,kind,target_alias_id) references sky_private.graph_alias(acceptance_revision,kind,from_id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_alias_identity_idx on sky_private.graph_alias(acceptance_revision,kind,target_identity_id);
create index graph_alias_chain_idx on sky_private.graph_alias(acceptance_revision,kind,target_alias_id);
create table sky_private.graph_tombstone (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,kind text not null,id text not null,retired_at text not null check(sky_private.iso_instant(retired_at) is not null),replacement_id text,position integer not null check(position>=0),
 primary key(acceptance_revision,kind,id),unique(acceptance_revision,position),
 foreign key(acceptance_revision,kind,id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,kind,replacement_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_tombstone_replacement_idx on sky_private.graph_tombstone(acceptance_revision,kind,replacement_id);

create table sky_private.graph_item_season (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('item'::text) stored,to_kind text generated always as('season'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_item_season_from_idx on sky_private.graph_item_season(acceptance_revision,from_kind,from_id);
create index graph_item_season_to_idx on sky_private.graph_item_season(acceptance_revision,to_kind,to_id);

create table sky_private.graph_item_spirit (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('item'::text) stored,to_kind text generated always as('spirit'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_item_spirit_from_idx on sky_private.graph_item_spirit(acceptance_revision,from_kind,from_id);
create index graph_item_spirit_to_idx on sky_private.graph_item_spirit(acceptance_revision,to_kind,to_id);

create table sky_private.graph_spirit_season (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('spirit'::text) stored,to_kind text generated always as('season'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_spirit_season_from_idx on sky_private.graph_spirit_season(acceptance_revision,from_kind,from_id);
create index graph_spirit_season_to_idx on sky_private.graph_spirit_season(acceptance_revision,to_kind,to_id);

create table sky_private.graph_spirit_location (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('spirit'::text) stored,to_kind text generated always as('location'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_spirit_location_from_idx on sky_private.graph_spirit_location(acceptance_revision,from_kind,from_id);
create index graph_spirit_location_to_idx on sky_private.graph_spirit_location(acceptance_revision,to_kind,to_id);

create table sky_private.graph_cosmetic_item (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('cosmetic'::text) stored,to_kind text generated always as('item'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),
 unique(acceptance_revision,to_id),
 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_cosmetic_item_from_idx on sky_private.graph_cosmetic_item(acceptance_revision,from_kind,from_id);
create index graph_cosmetic_item_to_idx on sky_private.graph_cosmetic_item(acceptance_revision,to_kind,to_id);

create table sky_private.graph_event_location (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('event'::text) stored,to_kind text generated always as('location'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_event_location_from_idx on sky_private.graph_event_location(acceptance_revision,from_kind,from_id);
create index graph_event_location_to_idx on sky_private.graph_event_location(acceptance_revision,to_kind,to_id);

create table sky_private.graph_rule_event (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('eventRule'::text) stored,to_kind text generated always as('event'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_rule_event_from_idx on sky_private.graph_rule_event(acceptance_revision,from_kind,from_id);
create index graph_rule_event_to_idx on sky_private.graph_rule_event(acceptance_revision,to_kind,to_id);

create table sky_private.graph_override_event (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('eventOverride'::text) stored,to_kind text generated always as('event'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_override_event_from_idx on sky_private.graph_override_event(acceptance_revision,from_kind,from_id);
create index graph_override_event_to_idx on sky_private.graph_override_event(acceptance_revision,to_kind,to_id);

create table sky_private.graph_override_rule (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('eventOverride'::text) stored,to_kind text generated always as('eventRule'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_override_rule_from_idx on sky_private.graph_override_rule(acceptance_revision,from_kind,from_id);
create index graph_override_rule_to_idx on sky_private.graph_override_rule(acceptance_revision,to_kind,to_id);

create table sky_private.graph_occurrence_event (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('eventOccurrence'::text) stored,to_kind text generated always as('event'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_occurrence_event_from_idx on sky_private.graph_occurrence_event(acceptance_revision,from_kind,from_id);
create index graph_occurrence_event_to_idx on sky_private.graph_occurrence_event(acceptance_revision,to_kind,to_id);

create table sky_private.graph_occurrence_rule (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('eventOccurrence'::text) stored,to_kind text generated always as('eventRule'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_occurrence_rule_from_idx on sky_private.graph_occurrence_rule(acceptance_revision,from_kind,from_id);
create index graph_occurrence_rule_to_idx on sky_private.graph_occurrence_rule(acceptance_revision,to_kind,to_id);

create table sky_private.graph_occurrence_override (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('eventOccurrence'::text) stored,to_kind text generated always as('eventOverride'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_occurrence_override_from_idx on sky_private.graph_occurrence_override(acceptance_revision,from_kind,from_id);
create index graph_occurrence_override_to_idx on sky_private.graph_occurrence_override(acceptance_revision,to_kind,to_id);

create table sky_private.graph_instrument_item (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('instrument'::text) stored,to_kind text generated always as('item'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),
 unique(acceptance_revision,to_id),
 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_instrument_item_from_idx on sky_private.graph_instrument_item(acceptance_revision,from_kind,from_id);
create index graph_instrument_item_to_idx on sky_private.graph_instrument_item(acceptance_revision,to_kind,to_id);

create table sky_private.graph_instrument_samples (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('instrument'::text) stored,to_kind text generated always as('sampleSet'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),

 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_instrument_samples_from_idx on sky_private.graph_instrument_samples(acceptance_revision,from_kind,from_id);
create index graph_instrument_samples_to_idx on sky_private.graph_instrument_samples(acceptance_revision,to_kind,to_id);

create table sky_private.graph_emote_item (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('emote'::text) stored,to_kind text generated always as('item'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),
 unique(acceptance_revision,to_id),
 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_emote_item_from_idx on sky_private.graph_emote_item(acceptance_revision,from_kind,from_id);
create index graph_emote_item_to_idx on sky_private.graph_emote_item(acceptance_revision,to_kind,to_id);

create table sky_private.graph_call_item (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('call'::text) stored,to_kind text generated always as('item'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),
 unique(acceptance_revision,from_id),
 unique(acceptance_revision,to_id),
 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_call_item_from_idx on sky_private.graph_call_item(acceptance_revision,from_kind,from_id);
create index graph_call_item_to_idx on sky_private.graph_call_item(acceptance_revision,to_kind,to_id);

create table sky_private.graph_item_media (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('item'::text) stored,to_kind text generated always as('media'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_item_media_from_idx on sky_private.graph_item_media(acceptance_revision,from_kind,from_id);
create index graph_item_media_to_idx on sky_private.graph_item_media(acceptance_revision,to_kind,to_id);

create table sky_private.graph_emote_media (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('emote'::text) stored,to_kind text generated always as('media'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_emote_media_from_idx on sky_private.graph_emote_media(acceptance_revision,from_kind,from_id);
create index graph_emote_media_to_idx on sky_private.graph_emote_media(acceptance_revision,to_kind,to_id);

create table sky_private.graph_call_media (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('call'::text) stored,to_kind text generated always as('media'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_call_media_from_idx on sky_private.graph_call_media(acceptance_revision,from_kind,from_id);
create index graph_call_media_to_idx on sky_private.graph_call_media(acceptance_revision,to_kind,to_id);

create table sky_private.graph_sample_media (
 acceptance_revision bigint not null references sky_private.acceptance_graph(acceptance_revision) on update restrict on delete restrict deferrable initially deferred,from_id text not null,to_id text not null,position integer not null check(position>=0),
 from_kind text generated always as('sampleSet'::text) stored,to_kind text generated always as('media'::text) stored,
 primary key(acceptance_revision,from_id,to_id),unique(acceptance_revision,position),


 foreign key(acceptance_revision,from_kind,from_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred,
 foreign key(acceptance_revision,to_kind,to_id) references sky_private.graph_identity(acceptance_revision,kind,id) on update restrict on delete restrict deferrable initially deferred
);
create index graph_sample_media_from_idx on sky_private.graph_sample_media(acceptance_revision,from_kind,from_id);
create index graph_sample_media_to_idx on sky_private.graph_sample_media(acceptance_revision,to_kind,to_id);

-- A derived UNION over fixed owners, never a generic relation storage owner.
create function sky_private.graph_edges(frame_revision bigint)
returns table(type text,from_kind text,to_kind text,from_id text,to_id text,"position" integer)
language sql stable security invoker set search_path='' as $$
 select 'itemSeason'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_item_season where acceptance_revision=frame_revision
 union all
 select 'itemSpirit'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_item_spirit where acceptance_revision=frame_revision
 union all
 select 'spiritSeason'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_spirit_season where acceptance_revision=frame_revision
 union all
 select 'spiritLocation'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_spirit_location where acceptance_revision=frame_revision
 union all
 select 'cosmeticItem'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_cosmetic_item where acceptance_revision=frame_revision
 union all
 select 'eventLocation'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_event_location where acceptance_revision=frame_revision
 union all
 select 'ruleEvent'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_rule_event where acceptance_revision=frame_revision
 union all
 select 'overrideEvent'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_override_event where acceptance_revision=frame_revision
 union all
 select 'overrideRule'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_override_rule where acceptance_revision=frame_revision
 union all
 select 'occurrenceEvent'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_occurrence_event where acceptance_revision=frame_revision
 union all
 select 'occurrenceRule'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_occurrence_rule where acceptance_revision=frame_revision
 union all
 select 'occurrenceOverride'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_occurrence_override where acceptance_revision=frame_revision
 union all
 select 'instrumentItem'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_instrument_item where acceptance_revision=frame_revision
 union all
 select 'instrumentSamples'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_instrument_samples where acceptance_revision=frame_revision
 union all
 select 'emoteItem'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_emote_item where acceptance_revision=frame_revision
 union all
 select 'callItem'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_call_item where acceptance_revision=frame_revision
 union all
 select 'itemMedia'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_item_media where acceptance_revision=frame_revision
 union all
 select 'emoteMedia'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_emote_media where acceptance_revision=frame_revision
 union all
 select 'callMedia'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_call_media where acceptance_revision=frame_revision
 union all
 select 'sampleMedia'::text,from_kind,to_kind,from_id,to_id,position from sky_private.graph_sample_media where acceptance_revision=frame_revision;
$$;
create function sky_private.guard_graph_history() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op<>'INSERT' then raise exception 'Canonical graph history is immutable' using errcode='23514';end if;
 -- Shared immutable parent lock serializes header vs child insert. Future driver
 -- must acquire global generation BEFORE any canonical/acceptance/graph writes.
 perform 1 from sky_private.sync_acceptance where revision=new.acceptance_revision for update;
 if not found then raise exception 'Graph acceptance is missing' using errcode='23503';end if;
 if exists(select 1 from sky_private.acceptance_graph where acceptance_revision=new.acceptance_revision) then
  raise exception 'Accepted graph frame is sealed' using errcode='23514';end if;
 return new;
end;
$$;
create function sky_private.validate_graph_header() returns trigger
language plpgsql security invoker set search_path='' as $$
declare frame_revision bigint:=new.acceptance_revision;
begin
 if new.identity_count<>(select count(*) from sky_private.graph_identity where acceptance_revision=frame_revision) then raise exception 'Graph count differs' using errcode='23514';end if;
 if new.identity_provenance_count<>(select count(*) from sky_private.graph_identity_provenance where acceptance_revision=frame_revision) then raise exception 'Graph count differs' using errcode='23514';end if;
 if new.candidate_provenance_count<>(select count(*) from sky_private.graph_provenance where acceptance_revision=frame_revision) then raise exception 'Graph count differs' using errcode='23514';end if;
 if new.crosswalk_count<>(select count(*) from sky_private.graph_crosswalk where acceptance_revision=frame_revision) then raise exception 'Graph count differs' using errcode='23514';end if;
 if new.alias_count<>(select count(*) from sky_private.graph_alias where acceptance_revision=frame_revision) then raise exception 'Graph count differs' using errcode='23514';end if;
 if new.tombstone_count<>(select count(*) from sky_private.graph_tombstone where acceptance_revision=frame_revision) then raise exception 'Graph count differs' using errcode='23514';end if;
 if new.relation_count<>(select count(*) from sky_private.graph_edges(frame_revision)) then raise exception 'Graph relation count differs' using errcode='23514';end if;
 if exists(select 1 from(select position,row_number() over(order by position)-1 expected from sky_private.graph_identity where acceptance_revision=frame_revision) p where position<>expected) then raise exception 'Graph order is incomplete' using errcode='23514';end if;
 if exists(select 1 from(select position,row_number() over(order by position)-1 expected from sky_private.graph_provenance where acceptance_revision=frame_revision) p where position<>expected) then raise exception 'Graph order is incomplete' using errcode='23514';end if;
 if exists(select 1 from(select position,row_number() over(order by position)-1 expected from sky_private.graph_crosswalk where acceptance_revision=frame_revision) p where position<>expected) then raise exception 'Graph order is incomplete' using errcode='23514';end if;
 if exists(select 1 from(select position,row_number() over(order by position)-1 expected from sky_private.graph_alias where acceptance_revision=frame_revision) p where position<>expected) then raise exception 'Graph order is incomplete' using errcode='23514';end if;
 if exists(select 1 from(select position,row_number() over(order by position)-1 expected from sky_private.graph_tombstone where acceptance_revision=frame_revision) p where position<>expected) then raise exception 'Graph order is incomplete' using errcode='23514';end if;
 if exists(select 1 from(select position,row_number() over(partition by kind,id order by position)-1 expected from sky_private.graph_identity_provenance where acceptance_revision=frame_revision) p where position<>expected)
  or exists(select 1 from(select position,row_number() over(order by position)-1 expected from sky_private.graph_edges(frame_revision)) p where position<>expected) then
  raise exception 'Graph evidence/relation order is incomplete or duplicated' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and not n.fixture
  and not exists(select 1 from sky_private.graph_identity_provenance p where (p.acceptance_revision,p.kind,p.id)=(n.acceptance_revision,n.kind,n.id))) then
  raise exception 'Graph nonfixture identity requires evidence' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_edges(frame_revision) e
  left join sky_private.graph_identity f on (f.acceptance_revision,f.kind,f.id)=(frame_revision,e.from_kind,e.from_id)
  left join sky_private.graph_identity t on (t.acceptance_revision,t.kind,t.id)=(frame_revision,e.to_kind,e.to_id)
  where f.id is null or t.id is null or f.retired_at is not null or t.retired_at is not null) then
  raise exception 'Graph relations require active declared endpoints' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='cosmetic' and n.retired_at is null and not exists(select 1 from sky_private.graph_cosmetic_item e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='eventRule' and n.retired_at is null and not exists(select 1 from sky_private.graph_rule_event e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='eventOverride' and n.retired_at is null and not exists(select 1 from sky_private.graph_override_event e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='eventOccurrence' and n.retired_at is null and not exists(select 1 from sky_private.graph_occurrence_event e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='instrument' and n.retired_at is null and not exists(select 1 from sky_private.graph_instrument_item e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='instrument' and n.retired_at is null and not exists(select 1 from sky_private.graph_instrument_samples e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='emote' and n.retired_at is null and not exists(select 1 from sky_private.graph_emote_item e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n where n.acceptance_revision=frame_revision and n.kind='call' and n.retired_at is null and not exists(select 1 from sky_private.graph_call_item e where (e.acceptance_revision,e.from_id)=(frame_revision,n.id))) then raise exception 'Graph required relation is missing' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_identity n left join sky_private.graph_tombstone t
  on (t.acceptance_revision,t.kind,t.id)=(n.acceptance_revision,n.kind,n.id)
  where n.acceptance_revision=frame_revision and ((n.retired_at is null)<>(t.id is null) or n.retired_at is distinct from t.retired_at))
  or exists(select 1 from sky_private.graph_tombstone t left join sky_private.graph_identity n
   on (n.acceptance_revision,n.kind,n.id)=(t.acceptance_revision,t.kind,t.id)
   left join sky_private.graph_identity r on (r.acceptance_revision,r.kind,r.id)=(t.acceptance_revision,t.kind,t.replacement_id)
   where t.acceptance_revision=frame_revision and (n.id is null or t.replacement_id is not null and (r.id is null or r.retired_at is not null))) then
  raise exception 'Graph tombstone/retirement/replacement differs' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_alias a left join sky_private.graph_identity n
  on (n.acceptance_revision,n.kind,n.id)=(a.acceptance_revision,a.kind,a.from_id)
  left join sky_private.graph_alias next_alias on (next_alias.acceptance_revision,next_alias.kind,next_alias.from_id)=(a.acceptance_revision,a.kind,a.target_identity_id)
  where a.acceptance_revision=frame_revision and (n.id is not null and n.retired_at is null or next_alias.from_id is not null)) then
  raise exception 'Alias source/discriminator differs' using errcode='23514';end if;
 if exists(with recursive walk(kind,root_id,next_id,seen,cycle) as (
  select kind,from_id,coalesce(target_alias_id,target_identity_id),array[from_id],false from sky_private.graph_alias where acceptance_revision=frame_revision
  union all select w.kind,w.root_id,coalesce(a.target_alias_id,a.target_identity_id),w.seen||w.next_id,w.next_id=any(w.seen)
   from walk w join sky_private.graph_alias a on (a.acceptance_revision,a.kind,a.from_id)=(frame_revision,w.kind,w.next_id) where not w.cycle
 ) select 1 from walk w left join sky_private.graph_alias a on (a.acceptance_revision,a.kind,a.from_id)=(frame_revision,w.kind,w.next_id)
 left join sky_private.graph_identity n on (n.acceptance_revision,n.kind,n.id)=(frame_revision,w.kind,w.next_id)
 left join sky_private.graph_tombstone t on (t.acceptance_revision,t.kind,t.id)=(frame_revision,w.kind,w.root_id)
 where w.cycle or a.from_id is null and (n.id is null or n.retired_at is not null or t.replacement_id is not null and t.replacement_id<>w.next_id)) then
  raise exception 'Graph alias cycle/terminal/replacement differs' using errcode='23514';end if;
 if exists(select 1 from sky_private.graph_override_rule r join sky_private.graph_override_event e using(acceptance_revision,from_id)
  join sky_private.graph_rule_event p on (p.acceptance_revision,p.from_id)=(r.acceptance_revision,r.to_id)
  where r.acceptance_revision=frame_revision and e.to_id<>p.to_id)
 or exists(select 1 from sky_private.graph_occurrence_rule r join sky_private.graph_occurrence_event e using(acceptance_revision,from_id)
  join sky_private.graph_rule_event p on (p.acceptance_revision,p.from_id)=(r.acceptance_revision,r.to_id)
  where r.acceptance_revision=frame_revision and e.to_id<>p.to_id)
 or exists(select 1 from sky_private.graph_occurrence_override r join sky_private.graph_occurrence_event e using(acceptance_revision,from_id)
  join sky_private.graph_override_event p on (p.acceptance_revision,p.from_id)=(r.acceptance_revision,r.to_id)
  where r.acceptance_revision=frame_revision and e.to_id<>p.to_id)
 or exists(select 1 from sky_private.graph_occurrence_override o join sky_private.graph_occurrence_rule r using(acceptance_revision,from_id)
  join sky_private.graph_override_rule p on (p.acceptance_revision,p.from_id)=(o.acceptance_revision,o.to_id)
  where o.acceptance_revision=frame_revision and r.to_id<>p.to_id) then
  raise exception 'Graph event/rule/override parent differs' using errcode='23514';end if;
 return null;
end;
$$;
create trigger complete_graph after insert on sky_private.acceptance_graph for each row execute function sky_private.validate_graph_header();
do $$
declare table_name text;
begin
 foreach table_name in array array['acceptance_graph','graph_provenance','graph_identity','graph_identity_provenance','graph_crosswalk','graph_alias','graph_tombstone','graph_item_season','graph_item_spirit','graph_spirit_season','graph_spirit_location','graph_cosmetic_item','graph_event_location','graph_rule_event','graph_override_event','graph_override_rule','graph_occurrence_event','graph_occurrence_rule','graph_occurrence_override','graph_instrument_item','graph_instrument_samples','graph_emote_item','graph_call_item','graph_item_media','graph_emote_media','graph_call_media','graph_sample_media'] loop
  execute format('alter table sky_private.%I enable row level security',table_name);
  execute format('create trigger immutable_graph before insert or update or delete on sky_private.%I for each row execute function sky_private.guard_graph_history()',table_name);
  execute format('create trigger immutable_graph_truncate before truncate on sky_private.%I for each statement execute function sky_private.guard_evidence_truncate()',table_name);
 end loop;
end;
$$;
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
