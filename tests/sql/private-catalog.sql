-- Test body appended after codec-generated synthetic inserts by the rehearsal
-- builder. Outer BEGIN/ROLLBACK and derived DB row response belong to that builder.
set constraints all immediate;
do $$
declare case_row record;actual_state text;passed integer:=0;
begin
  if not sky_private.valid_partial_time(true,'2026-10-07T00:00:00.'||repeat('0',500)||'1Z','instant',null,null)
    or not sky_private.valid_time_range(true,'2026-10-07T00:00:00.'||repeat('0',17000)||'1Z','instant',true,'2026-10-07T00:00:00.'||repeat('0',17000)||'2Z','instant')
    or sky_private.valid_time_range(true,'2026-10-07T00:00:00.'||repeat('0',17000)||'2Z','instant',true,'2026-10-07T00:00:00.'||repeat('0',17000)||'1Z','instant') then
    raise exception 'Arbitrary source fraction precision/underflow handling failed';
  end if;
  if (select count(*) from sky_private.acquisition_option where option_id='same-option')<>2 then
    raise exception 'Composite acquisition key was not retained';
  end if;
  if (select valid_from_value from sky_private.acquisition_option where item_id='tsa-cosmetic-9001')<>''
    or (select amount from sky_private.acquisition_cost where item_id='tsa-cosmetic-9001') is not null
    or (select friendship_node_id from sky_private.acquisition_option where item_id='tsa-cosmetic-9001')<>'future-node'
    or (select text from sky_private.item_translation where item_id='tsa-cosmetic-9001' and locale='__proto__')<>'translated literal key' then
    raise exception 'Unknown/null/deferred/literal translation values changed';
  end if;
  for case_row in select * from (values
    ('dangling identity',$sql$insert into sky_private.item(id,position,record_status,name_default,slot,dye_status,field_provenance_present) values ('missing',2,'draft','','unknown','unknown',false)$sql$,'23503'),
    ('wrong identity kind',$sql$insert into sky_private.item(id,position,record_status,name_default,slot,dye_status,field_provenance_present) values ('fixture-spirit',2,'draft','','unknown','unknown',false)$sql$,'23503'),
    ('duplicate option within item',$sql$insert into sky_private.acquisition_option select item_id,option_id,2,kind,cost_status,friendship_node_id,iap_product_id,valid_from_present,valid_from_value,valid_from_precision,valid_from_timezone,valid_from_raw_label,valid_to_present,valid_to_value,valid_to_precision,valid_to_timezone,valid_to_raw_label from sky_private.acquisition_option where item_id='tsa-cosmetic-9001'$sql$,'23505'),
    ('cost wrong owner',$sql$insert into sky_private.acquisition_cost values ('tsa-cosmetic-9001','missing',0,'candle','Candles',1)$sql$,'23503'),
    ('negative cost',$sql$update sky_private.acquisition_cost set amount=-1$sql$,'23514'),
    ('unsafe integer cost',$sql$update sky_private.acquisition_cost set amount=9007199254740992$sql$,'23514'),
    ('raw other currency missing label',$sql$update sky_private.acquisition_cost set source_currency_label=''$sql$,'23514'),
    ('known unknown cost',$sql$update sky_private.acquisition_option set cost_status='known' where item_id='tsa-cosmetic-9001'$sql$,'23514'),
    ('free positive cost',$sql$update sky_private.acquisition_option set cost_status='free' where item_id='tsa-cosmetic-9001';update sky_private.acquisition_cost set amount=1$sql$,'23514'),
    ('known without costs',$sql$update sky_private.acquisition_option set cost_status='known' where item_id='tsa-cosmetic-9002'$sql$,'23514'),
    ('acquisition evidence removal',$sql$delete from sky_private.acquisition_provenance where item_id='tsa-cosmetic-9001'$sql$,'23514'),
    ('cost truncate',$sql$truncate sky_private.acquisition_cost$sql$,'23514'),
    ('acquisition evidence truncate',$sql$truncate sky_private.acquisition_provenance$sql$,'23514'),
    ('dangling item season',$sql$insert into sky_private.item_season values ('tsa-cosmetic-9001','missing',2)$sql$,'23503'),
    ('duplicate relation',$sql$insert into sky_private.item_season values ('tsa-cosmetic-9001','fixture-season-a',2)$sql$,'23505'),
    ('invalid relation position',$sql$update sky_private.item_season set position=-1$sql$,'23514'),
    ('unapproved field evidence',$sql$insert into sky_private.field_provenance_field values ('item','tsa-cosmetic-9001','not-declared')$sql$,'23514'),
    ('empty declared field evidence',$sql$insert into sky_private.field_provenance_field values ('item','tsa-cosmetic-9001','name')$sql$,'23514'),
    ('field evidence removal',$sql$delete from sky_private.field_provenance where field='name'$sql$,'23514'),
    ('field evidence truncate',$sql$truncate sky_private.field_provenance$sql$,'23514'),
    ('partial time hidden value',$sql$update sky_private.acquisition_option set valid_from_present=false where item_id='tsa-cosmetic-9001'$sql$,'23514'),
    ('invalid date',$sql$update sky_private.acquisition_option set valid_to_value='2026-02-30' where item_id='tsa-cosmetic-9001'$sql$,'22008'),
    ('reversed date range',$sql$update sky_private.acquisition_option set valid_from_value='2026-10-08',valid_from_precision='date' where item_id='tsa-cosmetic-9001'$sql$,'23514'),
    ('exact fractional range',$sql$update sky_private.acquisition_option set valid_from_value='2026-10-07T00:00:00.123456789Z',valid_from_precision='instant',valid_to_value='2026-10-07T00:00:00.123456788Z',valid_to_precision='instant' where item_id='tsa-cosmetic-9001'$sql$,'23514'),
    ('money NaN',$sql$update sky_private.acquisition_source_offer set raw_money='NaN'::double precision$sql$,'23514'),
    ('money Infinity',$sql$update sky_private.acquisition_source_offer set raw_money='Infinity'::double precision$sql$,'23514'),
    ('money negative',$sql$update sky_private.acquisition_source_offer set raw_money=-1$sql$,'23514'),
    ('offer mismatched option',$sql$update sky_private.acquisition_source_offer set option_id='missing' where item_id='tsa-cosmetic-9001'$sql$,'23503'),
    ('invalid lookup stable ID',$sql$update sky_private.item_k15 set upstream_id=9003 where id='tsa-cosmetic-9001'$sql$,'23514'),
    ('invalid slot',$sql$update sky_private.item set slot='not-a-slot'$sql$,'23514'),
    ('entity payload removal',$sql$delete from sky_private.item where id='tsa-cosmetic-9001'$sql$,'23514'),
    ('entity payload truncate',$sql$truncate sky_private.item cascade$sql$,'23514')
  ) as cases(label,statement,expected_state) loop
    actual_state:=null;
    begin
      set constraints all deferred;
      execute case_row.statement;
      set constraints all immediate;
    exception when others then get stacked diagnostics actual_state=returned_sqlstate;
    end;
    if actual_state is distinct from case_row.expected_state then
      raise exception 'Case % expected SQLSTATE %, got %',case_row.label,case_row.expected_state,actual_state;
    end if;
    passed:=passed+1;
  end loop;
  if passed<>32 then raise exception 'Unexpected case count';end if;
  -- Known zero and explicit free zero are legal distinct states. Restore the
  -- original unknown/null fixture before returning actual DB rows to the codec.
  update sky_private.acquisition_cost set amount=0 where item_id='tsa-cosmetic-9001';
  update sky_private.acquisition_option set cost_status='known' where item_id='tsa-cosmetic-9001';
  if (select cost_status from sky_private.acquisition_option where item_id='tsa-cosmetic-9001')<>'known'
    or (select amount from sky_private.acquisition_cost where item_id='tsa-cosmetic-9001')<>0 then
    raise exception 'Explicit known zero was changed';
  end if;
  update sky_private.acquisition_option set cost_status='free' where item_id='tsa-cosmetic-9001';
  update sky_private.acquisition_option set cost_status='unknown' where item_id='tsa-cosmetic-9001';
  update sky_private.acquisition_cost set amount=null where item_id='tsa-cosmetic-9001';
end;
$$;
