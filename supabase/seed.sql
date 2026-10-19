-- Fictional demo files. Every company, person, number and amount is invented.
-- Dates are relative to today, so the attention list always has something to say.
-- Idempotent: run it as often as you like.

insert into appointments (id, ref, company_name, company_number, jurisdiction, kind, appointed_on, practitioner, practitioner_licence, manager, currency, notes) values
 ('10000000-0000-0000-0000-000000000001','CVL-001','Harbourline Fitouts Pty Ltd','ACN 600 000 101','AU','creditors_voluntary_liquidation', current_date - 100,'Rachel Moore','RL 900101','Priya','AUD','Shopfitter. Tipper still with the auction house. Report to creditors not yet out.'),
 ('10000000-0000-0000-0000-000000000002','VA-002','Coastal Kitchens Pty Ltd','ACN 600 000 202','AU','voluntary_administration', current_date - 3,'Rachel Moore','RL 900101','Tom','AUD','Trading on while a buyer for the business is sought.'),
 ('10000000-0000-0000-0000-000000000003','LIQ-003','Tamaki Joinery Limited','NZBN 9400000000303','NZ','creditors_voluntary_liquidation', current_date - 60,'Aroha Ngata','','Liam','NZD','Appointed by shareholders. Licence number not yet recorded on the file.'),
 ('10000000-0000-0000-0000-000000000004','LIQ-004','Ridgeview Transport Limited','NZBN 9400000000404','NZ','court_liquidation', current_date - 200,'Aroha Ngata','LIP-0457','Liam','NZD','Court appointed on an IRD application. Director current account claim open.'),
 ('10000000-0000-0000-0000-000000000005','CVL-005','Southgate Signage Pty Ltd','ACN 600 000 505','AU','court_liquidation', current_date - 420,'Rachel Moore','RL 900101','Tom','AUD','Unsecured dividend paid. Final steps.')
on conflict (id) do nothing;

insert into creditors (id, appointment_id, name, kind, contact, per_records_cents, is_related) values
 ('20000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','Jordan Blake','employee','jordan.b@example.com',920000,false),
 ('20000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','Mele Fifita','employee','mele.f@example.com',920000,false),
 ('20000000-0000-0000-0000-000000000103','10000000-0000-0000-0000-000000000001','Sam Ortiz','employee','sam.o@example.com',480000,false),
 ('20000000-0000-0000-0000-000000000104','10000000-0000-0000-0000-000000000001','Australian Taxation Office','tax_authority','',3845000,false),
 ('20000000-0000-0000-0000-000000000105','10000000-0000-0000-0000-000000000001','Pacific Timber Supplies Ltd','trade','accounts@pacifictimber.example',2218000,false),
 ('20000000-0000-0000-0000-000000000106','10000000-0000-0000-0000-000000000001','Northside Plasterboard Pty Ltd','trade','ar@northside.example',1560000,false),
 ('20000000-0000-0000-0000-000000000107','10000000-0000-0000-0000-000000000001','Brightline Electrical','trade','',790000,false),
 ('20000000-0000-0000-0000-000000000108','10000000-0000-0000-0000-000000000001','Daniel Harbour','related_party','director',12000000,true),
 ('20000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002','Gold Coast Stone Benchtops','trade','',1840000,false),
 ('20000000-0000-0000-0000-000000000202','10000000-0000-0000-0000-000000000002','Southern Appliance Wholesale','trade','',2675000,false),
 ('20000000-0000-0000-0000-000000000203','10000000-0000-0000-0000-000000000002','Australian Taxation Office','tax_authority','',1910000,false),
 ('20000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003','Wiremu Tane','employee','wiremu.t@example.com',640000,false),
 ('20000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000003','Kate Lin','employee','kate.l@example.com',510000,false),
 ('20000000-0000-0000-0000-000000000303','10000000-0000-0000-0000-000000000003','Inland Revenue','tax_authority','',2730000,false),
 ('20000000-0000-0000-0000-000000000304','10000000-0000-0000-0000-000000000003','Pacific Timber Supplies Ltd','trade','accounts@pacifictimber.example',1264000,false),
 ('20000000-0000-0000-0000-000000000305','10000000-0000-0000-0000-000000000003','Kauri Hardware','trade','',895000,false),
 ('20000000-0000-0000-0000-000000000306','10000000-0000-0000-0000-000000000003','Tamaki Holdings Limited','related_party','shareholder',6000000,true),
 ('20000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','Metro Fleet Finance','secured','',14000000,false),
 ('20000000-0000-0000-0000-000000000402','10000000-0000-0000-0000-000000000004','Inland Revenue','tax_authority','',5820000,false),
 ('20000000-0000-0000-0000-000000000403','10000000-0000-0000-0000-000000000004','Waikato Tyres','trade','',1130000,false),
 ('20000000-0000-0000-0000-000000000404','10000000-0000-0000-0000-000000000004','Ridgeview Holdings Limited','related_party','shareholder',9500000,true),
 ('20000000-0000-0000-0000-000000000405','10000000-0000-0000-0000-000000000004','Hemi Walker','employee','hemi.w@example.com',790000,false),
 ('20000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005','Lena Park','employee','lena.p@example.com',620000,false),
 ('20000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005','Marco Rossi','employee','marco.r@example.com',390000,false),
 ('20000000-0000-0000-0000-000000000503','10000000-0000-0000-0000-000000000005','Australian Taxation Office','tax_authority','',2200000,false),
 ('20000000-0000-0000-0000-000000000504','10000000-0000-0000-0000-000000000005','Metro Fleet Finance','trade','',1850000,false),
 ('20000000-0000-0000-0000-000000000505','10000000-0000-0000-0000-000000000005','Vivid Inks Pty Ltd','trade','',970000,false),
 ('20000000-0000-0000-0000-000000000506','10000000-0000-0000-0000-000000000005','Signs Direct Wholesale','trade','',1430000,false)
on conflict (id) do nothing;

insert into proofs (id, appointment_id, creditor_id, lodged_on, class, claimed_cents, status, admitted_cents, adjudicated_on, reason) values
 ('30000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000101', current_date - 80,'employee_wages',920000,'admitted',920000, current_date - 70,''),
 ('30000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000102', current_date - 80,'employee_wages',920000,'admitted',920000, current_date - 70,''),
 ('30000000-0000-0000-0000-000000000103','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000103', current_date - 78,'employee_leave',480000,'admitted',480000, current_date - 70,''),
 ('30000000-0000-0000-0000-000000000104','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000104', current_date - 40,'unsecured',4102000,'partly_admitted',3845000, current_date - 12,'Penalties and interest charged after the appointment are not provable'),
 ('30000000-0000-0000-0000-000000000105','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000105', current_date - 20,'unsecured',2990000,'lodged',0, null,''),
 ('30000000-0000-0000-0000-000000000106','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000106', current_date - 35,'unsecured',1560000,'admitted',1560000, current_date - 30,''),
 ('30000000-0000-0000-0000-000000000107','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000108', current_date - 45,'unsecured',12000000,'admitted',12000000, current_date - 15,''),
 ('30000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000301', current_date - 50,'employee_wages',640000,'admitted',640000, current_date - 45,''),
 ('30000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000302', current_date - 50,'employee_wages',510000,'admitted',510000, current_date - 45,''),
 ('30000000-0000-0000-0000-000000000303','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000303', current_date - 40,'tax_preferential',2730000,'admitted',2730000, current_date - 25,''),
 ('30000000-0000-0000-0000-000000000304','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000304', current_date - 38,'unsecured',1264000,'admitted',1264000, current_date - 20,''),
 ('30000000-0000-0000-0000-000000000305','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000305', current_date - 14,'unsecured',895000,'lodged',0, null,''),
 ('30000000-0000-0000-0000-000000000306','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000306', current_date - 30,'unsecured',6000000,'admitted',6000000, current_date - 18,''),
 ('30000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000405', current_date - 160,'employee_wages',790000,'admitted',790000, current_date - 150,''),
 ('30000000-0000-0000-0000-000000000402','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000402', current_date - 150,'tax_preferential',6100000,'partly_admitted',5820000, current_date - 100,'Use-of-money interest after liquidation commenced is not a provable claim'),
 ('30000000-0000-0000-0000-000000000403','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000403', current_date - 140,'unsecured',1130000,'admitted',1130000, current_date - 120,''),
 ('30000000-0000-0000-0000-000000000404','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000404', current_date - 130,'unsecured',9500000,'lodged',0, null,''),
 ('30000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000501', current_date - 390,'employee_wages',620000,'admitted',620000, current_date - 380,''),
 ('30000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000502', current_date - 390,'employee_leave',390000,'admitted',390000, current_date - 380,''),
 ('30000000-0000-0000-0000-000000000503','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000503', current_date - 300,'unsecured',2200000,'admitted',2200000, current_date - 250,''),
 ('30000000-0000-0000-0000-000000000504','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000504', current_date - 300,'unsecured',1850000,'admitted',1850000, current_date - 260,''),
 ('30000000-0000-0000-0000-000000000505','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000505', current_date - 280,'unsecured',970000,'admitted',970000, current_date - 240,''),
 ('30000000-0000-0000-0000-000000000506','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000506', current_date - 280,'unsecured',1430000,'rejected',0, current_date - 230,'Goods delivered after the appointment were paid in full; nothing was owed at the appointment date')
on conflict (id) do nothing;

insert into assets (id, appointment_id, description, kind, estimated_cents, status, realised_cents, realised_on, secured_to, notes) values
 ('40000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','Trade debtors','debtors',8500000,'realised',6120000, current_date - 70, null,''),
 ('40000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','Workshop plant and tools','plant',4000000,'realised',4450000, current_date - 55, null,''),
 ('40000000-0000-0000-0000-000000000103','10000000-0000-0000-0000-000000000001','2019 Isuzu tipper','vehicle',3000000,'to_realise',0, null, null,'With the auction house since week two'),
 ('40000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002','Kitchen stock and appliances','stock',1800000,'to_realise',0, null, null,''),
 ('40000000-0000-0000-0000-000000000202','10000000-0000-0000-0000-000000000002','Showroom fit-out and CNC router','plant',2600000,'to_realise',0, null, null,''),
 ('40000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003','Joinery machinery','plant',5500000,'realised',4800000, current_date - 30, null,''),
 ('40000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000003','Timber stock','stock',1200000,'realised',980000, current_date - 35, null,''),
 ('40000000-0000-0000-0000-000000000303','10000000-0000-0000-0000-000000000003','Trade debtors','debtors',2000000,'to_realise',0, null, null,'Director still to hand over the debtors ledger'),
 ('40000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','Three prime movers','vehicle',21000000,'realised',18600000, current_date - 150,'20000000-0000-0000-0000-000000000401',''),
 ('40000000-0000-0000-0000-000000000402','10000000-0000-0000-0000-000000000004','Claim against director (overdrawn current account)','recovery_claim',7500000,'to_realise',0, null, null,'Letter of demand sent; director disputes the balance'),
 ('40000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005','Sign-making equipment','plant',3500000,'realised',2750000, current_date - 350, null,''),
 ('40000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005','Service van','vehicle',1500000,'realised',1620000, current_date - 340, null,''),
 ('40000000-0000-0000-0000-000000000503','10000000-0000-0000-0000-000000000005','Trade debtors','debtors',1200000,'abandoned',0, current_date - 200, null,'Customers disputed every invoice; not worth pursuing')
on conflict (id) do nothing;

insert into dividends (id, appointment_id, class, notice_on, proofs_close_on, declared_on, pool_cents, cents_in_dollar) values
 ('50000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','employee_wages', current_date - 60, current_date - 38, current_date - 30, 1840000, 100),
 ('50000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','unsecured', current_date - 30, current_date - 5, null, null, null),
 ('50000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003','employee_wages', current_date - 40, current_date - 18, current_date - 10, 1150000, 100),
 ('50000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','employee_wages', current_date - 130, current_date - 110, current_date - 95, 790000, 100),
 ('50000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005','employee_wages', current_date - 330, current_date - 305, current_date - 300, 620000, 100),
 ('50000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005','unsecured', current_date - 100, current_date - 75, current_date - 60, 1004000, 20)
on conflict (id) do nothing;

insert into ledger (id, appointment_id, occurred_on, kind, category, description, amount_cents, asset_id, creditor_id, proof_id, dividend_id, payee) values
 ('60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001', current_date - 70,'receipt','realisation','Trade debtors collected',6120000,'40000000-0000-0000-0000-000000000101',null,null,null,''),
 ('60000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001', current_date - 55,'receipt','realisation','Workshop plant sold at auction',4450000,'40000000-0000-0000-0000-000000000102',null,null,null,''),
 ('60000000-0000-0000-0000-000000000103','10000000-0000-0000-0000-000000000001', current_date - 55,'payment','agent','Auction commission and costs',320000,null,null,null,null,'Eastside Auctions'),
 ('60000000-0000-0000-0000-000000000104','10000000-0000-0000-0000-000000000001', current_date - 50,'payment','legal','Advice on director loan account',650000,null,null,null,null,'Harbour Legal'),
 ('60000000-0000-0000-0000-000000000105','10000000-0000-0000-0000-000000000001', current_date - 35,'payment','remuneration','Remuneration drawn',3000000,null,null,null,null,'Rachel Moore'),
 ('60000000-0000-0000-0000-000000000106','10000000-0000-0000-0000-000000000001', current_date - 30,'dividend','dividend','employee_wages dividend 100c in the dollar',920000,null,'20000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000101','50000000-0000-0000-0000-000000000101','Jordan Blake'),
 ('60000000-0000-0000-0000-000000000107','10000000-0000-0000-0000-000000000001', current_date - 30,'dividend','dividend','employee_wages dividend 100c in the dollar',920000,null,'20000000-0000-0000-0000-000000000102','30000000-0000-0000-0000-000000000102','50000000-0000-0000-0000-000000000101','Mele Fifita'),
 ('60000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002', current_date - 1,'receipt','trading','Trading receipts while the administrator trades on',435000,null,null,null,null,''),
 ('60000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003', current_date - 35,'receipt','realisation','Timber stock sold',980000,'40000000-0000-0000-0000-000000000302',null,null,null,''),
 ('60000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000003', current_date - 30,'receipt','realisation','Joinery machinery sold',4800000,'40000000-0000-0000-0000-000000000301',null,null,null,''),
 ('60000000-0000-0000-0000-000000000303','10000000-0000-0000-0000-000000000003', current_date - 30,'payment','agent','Valuer and sale costs',290000,null,null,null,null,'Kiwi Plant Valuers'),
 ('60000000-0000-0000-0000-000000000304','10000000-0000-0000-0000-000000000003', current_date - 15,'payment','remuneration','Remuneration drawn',1200000,null,null,null,null,'Aroha Ngata'),
 ('60000000-0000-0000-0000-000000000305','10000000-0000-0000-0000-000000000003', current_date - 10,'dividend','dividend','employee_wages dividend 100c in the dollar',640000,null,'20000000-0000-0000-0000-000000000301','30000000-0000-0000-0000-000000000301','50000000-0000-0000-0000-000000000301','Wiremu Tane'),
 ('60000000-0000-0000-0000-000000000306','10000000-0000-0000-0000-000000000003', current_date - 10,'dividend','dividend','employee_wages dividend 100c in the dollar',510000,null,'20000000-0000-0000-0000-000000000302','30000000-0000-0000-0000-000000000302','50000000-0000-0000-0000-000000000301','Kate Lin'),
 ('60000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004', current_date - 150,'receipt','realisation','Prime movers sold',18600000,'40000000-0000-0000-0000-000000000401',null,null,null,''),
 ('60000000-0000-0000-0000-000000000402','10000000-0000-0000-0000-000000000004', current_date - 145,'payment','other','Paid to the secured creditor under its security',14000000,null,'20000000-0000-0000-0000-000000000401',null,null,'Metro Fleet Finance'),
 ('60000000-0000-0000-0000-000000000403','10000000-0000-0000-0000-000000000004', current_date - 120,'payment','legal','Demand and court costs on the director claim',980000,null,null,null,null,'Waikato Law'),
 ('60000000-0000-0000-0000-000000000404','10000000-0000-0000-0000-000000000004', current_date - 95,'dividend','dividend','employee_wages dividend 100c in the dollar',790000,null,'20000000-0000-0000-0000-000000000405','30000000-0000-0000-0000-000000000401','50000000-0000-0000-0000-000000000401','Hemi Walker'),
 ('60000000-0000-0000-0000-000000000405','10000000-0000-0000-0000-000000000004', current_date - 60,'payment','remuneration','Remuneration drawn',2500000,null,null,null,null,'Aroha Ngata'),
 ('60000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005', current_date - 350,'receipt','realisation','Sign-making equipment sold',2750000,'40000000-0000-0000-0000-000000000501',null,null,null,''),
 ('60000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005', current_date - 340,'receipt','realisation','Service van sold',1620000,'40000000-0000-0000-0000-000000000502',null,null,null,''),
 ('60000000-0000-0000-0000-000000000503','10000000-0000-0000-0000-000000000005', current_date - 330,'payment','legal','Advice on debtor disputes',410000,null,null,null,null,'Southgate Legal'),
 ('60000000-0000-0000-0000-000000000504','10000000-0000-0000-0000-000000000005', current_date - 300,'dividend','dividend','employee_wages dividend 100c in the dollar',620000,null,'20000000-0000-0000-0000-000000000501','30000000-0000-0000-0000-000000000501','50000000-0000-0000-0000-000000000501','Lena Park'),
 ('60000000-0000-0000-0000-000000000505','10000000-0000-0000-0000-000000000005', current_date - 100,'payment','remuneration','Remuneration drawn',1950000,null,null,null,null,'Rachel Moore'),
 ('60000000-0000-0000-0000-000000000506','10000000-0000-0000-0000-000000000005', current_date - 60,'dividend','dividend','unsecured dividend 20c in the dollar',440000,null,'20000000-0000-0000-0000-000000000503','30000000-0000-0000-0000-000000000503','50000000-0000-0000-0000-000000000502','Australian Taxation Office'),
 ('60000000-0000-0000-0000-000000000507','10000000-0000-0000-0000-000000000005', current_date - 60,'dividend','dividend','unsecured dividend 20c in the dollar',370000,null,'20000000-0000-0000-0000-000000000504','30000000-0000-0000-0000-000000000504','50000000-0000-0000-0000-000000000502','Metro Fleet Finance'),
 ('60000000-0000-0000-0000-000000000508','10000000-0000-0000-0000-000000000005', current_date - 60,'dividend','dividend','unsecured dividend 20c in the dollar',194000,null,'20000000-0000-0000-0000-000000000505','30000000-0000-0000-0000-000000000505','50000000-0000-0000-0000-000000000502','Vivid Inks Pty Ltd')
on conflict (id) do nothing;

insert into remuneration_approvals (id, appointment_id, approved_on, approved_by, amount_cents, period) values
 ('70000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001', current_date - 40,'creditors',4500000,'Appointment to report to creditors'),
 ('70000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003', current_date - 20,'creditors',2000000,'Fee basis to the first six-monthly report'),
 ('70000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004', current_date - 165,'creditors',3000000,'Fee basis agreed at the creditors'' meeting'),
 ('70000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005', current_date - 330,'committee',1800000,'Appointment to dividend')
on conflict (id) do nothing;

insert into time_entries (id, appointment_id, worked_on, staff, task, minutes, rate_cents, description) values
 ('80000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001', current_date - 90,'Rachel Moore','investigation',1200,65000,'Books and records review'),
 ('80000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001', current_date - 60,'Priya','assets',1800,45000,'Debtor collections and auction'),
 ('80000000-0000-0000-0000-000000000103','10000000-0000-0000-0000-000000000001', current_date - 40,'Priya','creditors',1800,45000,'Proofs and creditor enquiries'),
 ('80000000-0000-0000-0000-000000000104','10000000-0000-0000-0000-000000000001', current_date - 32,'Tom','employees',2400,30000,'Employee entitlements and dividend'),
 ('80000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002', current_date - 2,'Rachel Moore','trade_on',480,65000,'Trading decisions and staff briefing'),
 ('80000000-0000-0000-0000-000000000202','10000000-0000-0000-0000-000000000002', current_date - 1,'Tom','trade_on',600,30000,'Daily takings and supplier accounts'),
 ('80000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003', current_date - 50,'Aroha Ngata','assets',900,42000,'Machinery sale'),
 ('80000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000003', current_date - 25,'Liam','creditors',900,42000,'Claims and IRD'),
 ('80000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004', current_date - 180,'Aroha Ngata','investigation',1800,41000,'Director current account'),
 ('80000000-0000-0000-0000-000000000402','10000000-0000-0000-0000-000000000004', current_date - 140,'Liam','assets',1800,41000,'Prime mover sale and secured creditor'),
 ('80000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005', current_date - 360,'Rachel Moore','assets',1200,40000,'Equipment sale'),
 ('80000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005', current_date - 90,'Tom','dividend',1800,40000,'Unsecured dividend')
on conflict (id) do nothing;

insert into meetings (id, appointment_id, kind, notice_sent_on, meeting_on, held, outcome) values
 ('90000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002','first', current_date - 2, current_date + 6, false,''),
 ('90000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','creditors', current_date - 175, current_date - 165, true,'Creditors agreed the fee basis; no committee formed')
on conflict (id) do nothing;

insert into events (id, appointment_id, event, period_no, done_on, reference) values
 ('a0000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','dirri',1, current_date - 96,'Sent with the initial notice'),
 ('a0000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','initial_notice',1, current_date - 94,'Initial notice to 8 creditors'),
 ('a0000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002','first_meeting_notice',1, current_date - 2,'Notice, DIRRI and initial information'),
 ('a0000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003','initial_report',1, current_date - 57,'First report filed with the Registrar'),
 ('a0000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000003','creditors_meeting',1, current_date - 52,'s 245 notice: no meeting'),
 ('a0000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','initial_report',1, current_date - 170,'First report filed with the Registrar'),
 ('a0000000-0000-0000-0000-000000000402','10000000-0000-0000-0000-000000000004','creditors_meeting',1, current_date - 165,'Meeting minutes'),
 ('a0000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000005','initial_notice',1, current_date - 405,'Initial notice to 6 creditors'),
 ('a0000000-0000-0000-0000-000000000502','10000000-0000-0000-0000-000000000005','report_to_creditors',1, current_date - 320,'Report to creditors and Form 5601')
on conflict (id) do nothing;

insert into tasks (id, appointment_id, title, owner, due_on, done_on) values
 ('b0000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000001','Chase the auction house on the tipper sale','Priya', current_date - 6, null),
 ('b0000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000001','Check Pacific Timber invoices against the creditor ledger','Priya', current_date + 3, null),
 ('b0000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002','Collect expressions of interest for the business','Tom', current_date + 10, null),
 ('b0000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000003','Get the debtors ledger from the director','Liam', current_date + 5, null),
 ('b0000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000004','Decide whether to issue proceedings on the director claim','Liam', current_date + 20, null)
on conflict (id) do nothing;

insert into activity (appointment_id, at, actor, action, detail)
select v.appointment_id::uuid, now() - make_interval(days => v.days_ago), v.actor, 'seed', v.detail
from (values
  ('10000000-0000-0000-0000-000000000001', 100, 'Rachel Moore', 'Appointed liquidator by members'' resolution'),
  ('10000000-0000-0000-0000-000000000001', 12, 'Priya', 'ATO proof part-admitted'),
  ('10000000-0000-0000-0000-000000000001', 5, 'Priya', 'Unsecured proofs closed'),
  ('10000000-0000-0000-0000-000000000002', 3, 'Rachel Moore', 'Appointed administrator by board resolution'),
  ('10000000-0000-0000-0000-000000000002', 1, 'Tom', 'Trading receipts banked'),
  ('10000000-0000-0000-0000-000000000003', 60, 'Aroha Ngata', 'Appointed liquidator by shareholders'),
  ('10000000-0000-0000-0000-000000000003', 10, 'Liam', 'Preferential employee dividend paid'),
  ('10000000-0000-0000-0000-000000000004', 200, 'Aroha Ngata', 'Appointed liquidator by the High Court'),
  ('10000000-0000-0000-0000-000000000004', 45, 'Liam', 'Director response to demand received'),
  ('10000000-0000-0000-0000-000000000005', 420, 'Rachel Moore', 'Appointed liquidator by the court'),
  ('10000000-0000-0000-0000-000000000005', 12, 'Tom', 'Annual return working papers started')
) as v(appointment_id, days_ago, actor, detail)
where not exists (select 1 from activity where action = 'seed');
