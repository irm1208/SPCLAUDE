--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: delivery_methods; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.delivery_methods VALUES ('dm-inpost', 'InPost', 3.00, true, 2, '2026-03-18 15:19:10.662+00', '2026-03-18 15:19:10.662+00');
INSERT INTO public.delivery_methods VALUES ('dm-international', 'International', 8.50, false, 3, '2026-03-18 15:19:10.665+00', '2026-03-18 15:19:10.665+00');
INSERT INTO public.delivery_methods VALUES ('dm-royal-mail', 'Royal Mail', 10.00, true, 1, '2026-03-18 15:19:10.655+00', '2026-03-18 15:19:10.655+00');


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.orders VALUES ('03a194ac-176f-45d5-9f81-6a28e7f17c0c', '0027', '@S S C', 'InPost', 'dm-inpost', 3.00, 0.00, 491.00, 0.00, 494.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.032+00', '2026-03-18 20:20:09.032+00');
INSERT INTO public.orders VALUES ('0581d320-40f1-40e7-9adb-cd05ffaabda1', '0025', 'Fergus', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 480.00, 0.00, 490.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.021+00', '2026-03-18 20:20:09.021+00');
INSERT INTO public.orders VALUES ('05edc6e3-04b1-4487-bdda-898348202bfb', '0035', '@hotlinerider', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 575.00, 0.00, 585.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.074+00', '2026-03-18 20:20:09.074+00');
INSERT INTO public.orders VALUES ('17b2c399-9bba-4740-8b1e-751b5baaa252', '0011', '@J4mes_R', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 717.50, 0.00, 727.50, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.94+00', '2026-03-18 20:20:08.94+00');
INSERT INTO public.orders VALUES ('1b975899-08c0-439c-b0bb-b65f0092d0aa', '0013', '@zebble76', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 180.00, 0.00, 190.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.951+00', '2026-03-18 20:20:08.951+00');
INSERT INTO public.orders VALUES ('208c5098-466d-41e8-9f75-0218fbf1db3f', '0023', '@JB Adipo', 'InPost', 'dm-inpost', 3.00, 0.00, 450.00, 0.00, 453.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.01+00', '2026-03-18 20:20:09.01+00');
INSERT INTO public.orders VALUES ('3a5df063-138c-4498-bef2-6d733ca93ea2', '0009', '@jakeh1992', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 195.00, 0.00, 205.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.927+00', '2026-03-18 20:20:08.927+00');
INSERT INTO public.orders VALUES ('3b7280a7-b855-489a-b9d1-b2f03e5f3d0b', '0030', '@josie_uk', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 220.00, 0.00, 230.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.048+00', '2026-03-18 20:20:09.048+00');
INSERT INTO public.orders VALUES ('3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', '0003', 'UntamedChazy', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 930.00, 0.00, 940.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.887+00', '2026-03-18 20:20:08.887+00');
INSERT INTO public.orders VALUES ('3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1', '0042', 'Leonidas', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 435.00, 0.00, 445.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.105+00', '2026-03-18 20:20:09.105+00');
INSERT INTO public.orders VALUES ('7522e0b8-cf16-40ef-aff9-9b3180098433', '0024', '@ADev81', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 325.00, 0.00, 335.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.016+00', '2026-03-18 20:20:09.016+00');
INSERT INTO public.orders VALUES ('7d6339fe-0e7e-4f13-a613-9964a321e863', '0037', 'FBX2000', 'Royal Mail', 'dm-royal-mail', 0.00, 0.00, 85.00, 0.00, 85.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.084+00', '2026-03-18 20:20:09.084+00');
INSERT INTO public.orders VALUES ('813442f1-cfc6-45bc-9a82-3d1a63068328', '0029', '@noshoesnoservice', 'InPost', 'dm-inpost', 3.00, 0.00, 160.00, 0.00, 163.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.043+00', '2026-03-18 20:20:09.043+00');
INSERT INTO public.orders VALUES ('83a3d960-ba23-47a3-883c-ed6883ab9d27', '0034', '@Jayjo8', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 751.00, 0.00, 761.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.069+00', '2026-03-18 20:20:09.069+00');
INSERT INTO public.orders VALUES ('872ee5ff-b754-4068-ad98-c7c06c86e42d', '0033', 'Lizzie2391', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 135.00, 0.00, 145.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.065+00', '2026-03-18 20:20:09.065+00');
INSERT INTO public.orders VALUES ('8fee86d5-5f56-462a-bc6f-354c2bcdc90e', '0016', '@kenupfront', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 1876.00, 0.00, 1886.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.968+00', '2026-03-18 20:20:08.968+00');
INSERT INTO public.orders VALUES ('9ece120d-7dbc-4009-ae0c-658d3d58b3d5', '0031', '@Nemo', 'Royal Mail', 'dm-royal-mail', 0.00, 0.00, 121.00, 0.00, 121.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.054+00', '2026-03-18 20:20:09.054+00');
INSERT INTO public.orders VALUES ('a22f7966-b42d-4cab-81c3-c94983f0e590', '0040', 'Shaida Ali', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 431.00, 0.00, 441.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.1+00', '2026-03-18 20:20:09.1+00');
INSERT INTO public.orders VALUES ('a434d697-4ad9-481d-8b13-74d343cd9590', '0036', '@Zii', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 51.00, 0.00, 61.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.079+00', '2026-03-18 20:20:09.079+00');
INSERT INTO public.orders VALUES ('a4cab9d2-7cb6-4f24-baa6-208f41bad4ca', '0005', 'finguk', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 95.00, 0.00, 105.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.903+00', '2026-03-18 20:20:08.903+00');
INSERT INTO public.orders VALUES ('af9e5b89-b039-4746-93be-5e2c9cf2dddd', '0022', 'Mand', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 1231.00, 0.00, 1241.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.003+00', '2026-03-18 20:20:09.003+00');
INSERT INTO public.orders VALUES ('b096c66d-5870-4010-9511-45e13727908c', '0020', 'OJ', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 250.00, 0.00, 260.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.991+00', '2026-03-18 20:20:08.991+00');
INSERT INTO public.orders VALUES ('b0ca116d-aaea-4b84-9ae0-8cac8ad64280', '0039', '@vasendak', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 165.00, 0.00, 175.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.094+00', '2026-03-18 20:20:09.094+00');
INSERT INTO public.orders VALUES ('bb1c75a0-a705-4887-9f13-38ed114c6af3', '2164', '@entangledpep', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 85.00, 0.00, 95.00, NULL, 'Submitted', NULL, NULL, NULL, 'confirmed', '0x551253d4667ab3dfb6736686c8599a6102166cb847b851d62e797287df0dfcf1', NULL, NULL, NULL, NULL, '0123', NULL, '2026-03-18 22:19:09.278+00', '2026-03-18 23:17:30.914+00');
INSERT INTO public.orders VALUES ('bfd2166a-c2df-46bd-a127-570af936afc7', '0018', 'Scottish_Basdurt', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 480.00, 0.00, 490.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.981+00', '2026-03-18 20:20:08.981+00');
INSERT INTO public.orders VALUES ('c0a3135e-928e-4285-8916-e1f7ed71e04b', '0007', '@JohnnyWalker70', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 755.00, 0.00, 765.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.914+00', '2026-03-18 20:20:08.914+00');
INSERT INTO public.orders VALUES ('c310cffd-47c0-4225-ade9-62923897b77f', '0004', '1poundfish', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 205.00, 0.00, 215.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.895+00', '2026-03-18 20:20:08.895+00');
INSERT INTO public.orders VALUES ('c67237d3-15ca-4487-b138-43c30d2e1df0', '0001', '@Reeper90', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 1120.00, 0.00, 1130.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.872+00', '2026-03-18 20:20:08.872+00');
INSERT INTO public.orders VALUES ('c675f7ec-5f9d-436a-afbd-fff7a1d4621a', '0015', '@OC1313', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 165.00, 0.00, 175.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.962+00', '2026-03-18 20:20:08.962+00');
INSERT INTO public.orders VALUES ('cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', '0026', 'mick', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 445.00, 0.00, 455.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.027+00', '2026-03-18 20:20:09.027+00');
INSERT INTO public.orders VALUES ('d25da38b-20aa-40ff-ba34-e1638b380836', '0019', 'Pink ladybug', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 1282.50, 0.00, 1292.50, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.986+00', '2026-03-18 20:20:08.986+00');
INSERT INTO public.orders VALUES ('d9eff3e7-6d9b-4aac-a009-c49b0299b99c', '0006', '@slimsimma', '', '', 0.00, 0.00, 202.50, 0.00, 202.50, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.909+00', '2026-03-18 20:20:08.909+00');
INSERT INTO public.orders VALUES ('e00b0557-6024-42ab-826c-31d5da1e3674', '0038', '@K_andL', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 75.00, 0.00, 85.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.089+00', '2026-03-18 20:20:09.089+00');
INSERT INTO public.orders VALUES ('e8b38f59-85d4-4c03-9581-eca90f3bf35f', '0021', '@HAGRIDV99', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 185.00, 0.00, 195.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.998+00', '2026-03-18 20:20:08.998+00');
INSERT INTO public.orders VALUES ('ece1625b-f1c1-48fc-827c-9a5978560ac7', '0043', 'Clarke', '', '', 0.00, 0.00, 35.00, 0.00, 35.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.11+00', '2026-03-18 20:20:09.11+00');
INSERT INTO public.orders VALUES ('ed8e0967-57d6-421d-906e-8ca68e8cc3ba', '0032', '@NeverEvenSeenIt', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 160.00, 0.00, 170.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.059+00', '2026-03-18 20:20:09.059+00');
INSERT INTO public.orders VALUES ('f390e78f-35ca-4021-a236-a0c36532a061', '0012', '@JBonwards', 'InPost', 'dm-inpost', 3.00, 0.00, 120.00, 0.00, 123.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.946+00', '2026-03-18 20:20:08.946+00');
INSERT INTO public.orders VALUES ('f5fb9f44-af87-40fc-b265-b91138f1f172', '0028', '@John Blair', 'InPost', 'dm-inpost', 3.00, 0.00, 125.00, 0.00, 128.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:09.038+00', '2026-03-18 20:20:09.038+00');
INSERT INTO public.orders VALUES ('f68aa4a8-ff01-405f-bcc0-963f4e8de0c7', '0002', 'mIRCulina', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 231.00, 0.00, 241.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.881+00', '2026-03-18 20:20:08.881+00');
INSERT INTO public.orders VALUES ('f7a805fd-f97e-4689-a011-2737dadc372f', '0014', '@T86102023', 'InPost', 'dm-inpost', 3.00, 0.00, 95.00, 0.00, 98.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.957+00', '2026-03-18 20:20:08.957+00');
INSERT INTO public.orders VALUES ('fb87ced5-8e31-4eaf-a3cd-64cba23b3188', '0008', 'Prem', '', '', 0.00, 0.00, 863.00, 0.00, 863.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.92+00', '2026-03-18 20:20:08.92+00');
INSERT INTO public.orders VALUES ('fff847e8-871c-423b-86c5-eddea6dfe217', '0010', '@Jack3797', '', '', 0.00, 0.00, 551.00, 0.00, 551.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.933+00', '2026-03-18 20:20:08.933+00');
INSERT INTO public.orders VALUES ('6f6de2e0-09fd-4ba9-a538-07683263fd23', '0017', 'Scott', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 310.00, 0.00, 320.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-18 20:20:08.976+00', '2026-03-19 15:35:27.734+00');
INSERT INTO public.orders VALUES ('b3a84822-5580-47c7-bfe0-7b61f1908c05', '8148', '@5egergfr', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 122.50, 0.00, 132.50, NULL, 'Submitted', NULL, 'does this work', NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '1786', NULL, '2026-03-19 17:00:15.099552+00', '2026-03-19 17:02:08.563+00');
INSERT INTO public.orders VALUES ('7c4198b0-56ca-4561-a79e-9b04debe3cf9', '3733', '@wefewfwf', 'Royal Mail', 'dm-royal-mail', 10.00, 0.00, 80.00, 0.00, 90.00, NULL, 'Submitted', NULL, NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '0000', NULL, '2026-03-19 17:02:22.401241+00', '2026-03-19 17:02:22.401241+00');


--
-- Data for Name: order_line_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.order_line_items VALUES ('00c14223-3de3-40a3-b32b-f963766b3ff2', '3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1', 'p012', 'Retatrutide 40mg', 1.00, 165.00, 165.00, '2026-03-18 20:20:09.108+00', '2026-03-18 20:20:09.108+00');
INSERT INTO public.order_line_items VALUES ('045bd1a3-13a9-4aec-83a2-1ad79d067cc8', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p057', 'Ipamorelin 10mg', 1.00, 80.00, 80.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('059f8ec1-1839-4ffb-a69a-26cc2dda10ae', '17b2c399-9bba-4740-8b1e-751b5baaa252', 'p110', 'Cortagen 20mg', 0.50, 120.00, 60.00, '2026-03-18 20:20:08.942+00', '2026-03-18 20:20:08.942+00');
INSERT INTO public.order_line_items VALUES ('06b2e768-c30a-47e4-a991-2ad7096f205d', 'c0a3135e-928e-4285-8916-e1f7ed71e04b', 'p020', 'GAC water 3ml', 1.00, 15.00, 15.00, '2026-03-18 20:20:08.917+00', '2026-03-18 20:20:08.917+00');
INSERT INTO public.order_line_items VALUES ('085e0a8b-7508-42ff-b882-fbac4555c93e', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p039', 'Epitalon 10mg', 2.00, 45.00, 90.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('0c322c29-3763-455b-abbf-d4fb4123d9d5', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p085', 'KPV 30mg', 0.50, 145.00, 72.50, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('0e5a319b-4b8a-4604-bac8-133667736ead', 'e8b38f59-85d4-4c03-9581-eca90f3bf35f', 'p007', 'Tirzepatide 60mg', 1.00, 135.00, 135.00, '2026-03-18 20:20:09+00', '2026-03-18 20:20:09+00');
INSERT INTO public.order_line_items VALUES ('0eeb1a71-3f32-483a-9543-f91da2299cdd', 'c310cffd-47c0-4225-ade9-62923897b77f', 'p084', 'KPV 10mg', 1.00, 60.00, 60.00, '2026-03-18 20:20:08.899+00', '2026-03-18 20:20:08.899+00');
INSERT INTO public.order_line_items VALUES ('0f3ae874-25a0-4b30-ae39-99f71483607d', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p024', 'HGH 10IU', 1.00, 50.00, 50.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('11161c95-1fec-4488-8165-27b0d5b01fc2', 'c0a3135e-928e-4285-8916-e1f7ed71e04b', 'p008', 'Tirzepatide 100mg', 1.00, 220.00, 220.00, '2026-03-18 20:20:08.917+00', '2026-03-18 20:20:08.917+00');
INSERT INTO public.order_line_items VALUES ('11b5b89c-e9db-478c-a454-48371a56da02', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p024', 'HGH 10IU', 3.00, 50.00, 150.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('11f966db-f067-4ec7-a884-80f932ec47ef', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p062', 'Selank 10mg', 1.00, 55.00, 55.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('12c545fe-b5be-4a5e-98cb-559d191970e4', 'bb1c75a0-a705-4887-9f13-38ed114c6af3', 'p004', 'Tirzepatide 20mg', 1.00, 85.00, 85.00, '2026-03-18 23:17:30.972+00', '2026-03-18 23:17:30.972+00');
INSERT INTO public.order_line_items VALUES ('12f728f6-c12c-40b0-bffe-0a66ac3b2ced', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('14e5799f-418f-4553-9571-e63e081e160e', 'b0ca116d-aaea-4b84-9ae0-8cac8ad64280', 'p069', 'DSIP 5mg', 1.00, 35.00, 35.00, '2026-03-18 20:20:09.097+00', '2026-03-18 20:20:09.097+00');
INSERT INTO public.order_line_items VALUES ('155afa06-600d-4f5a-8943-8d87126e7a0c', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p030', 'BPC 157 10mg', 1.00, 45.00, 45.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('155fa6e3-a08d-4234-9029-dd53207a02fe', '872ee5ff-b754-4068-ad98-c7c06c86e42d', 'p007', 'Tirzepatide 60mg', 1.00, 135.00, 135.00, '2026-03-18 20:20:09.067+00', '2026-03-18 20:20:09.067+00');
INSERT INTO public.order_line_items VALUES ('16d4b084-e8f3-455f-922e-fa6b0504c5c8', '83a3d960-ba23-47a3-883c-ed6883ab9d27', 'p118', 'Vesilute 20mg', 1.00, 120.00, 120.00, '2026-03-18 20:20:09.071+00', '2026-03-18 20:20:09.071+00');
INSERT INTO public.order_line_items VALUES ('170dfb42-e15f-459f-af09-61e9ad2b855a', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p007', 'Tirzepatide 60mg', 0.50, 135.00, 67.50, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('172b21c7-8208-4313-9fc5-44831ec771cd', '17b2c399-9bba-4740-8b1e-751b5baaa252', 'p049', 'Tesamorelin 10mg', 0.50, 125.00, 62.50, '2026-03-18 20:20:08.942+00', '2026-03-18 20:20:08.942+00');
INSERT INTO public.order_line_items VALUES ('18551a57-1fc8-4c3d-a57f-25bf5aaa8672', 'c0a3135e-928e-4285-8916-e1f7ed71e04b', 'p012', 'Retatrutide 40mg', 1.00, 165.00, 165.00, '2026-03-18 20:20:08.917+00', '2026-03-18 20:20:08.917+00');
INSERT INTO public.order_line_items VALUES ('1a00f57b-cf08-4efe-b81e-d7dd28f1ef06', 'e8b38f59-85d4-4c03-9581-eca90f3bf35f', 'p024', 'HGH 10IU', 1.00, 50.00, 50.00, '2026-03-18 20:20:09+00', '2026-03-18 20:20:09+00');
INSERT INTO public.order_line_items VALUES ('26e7c5e6-1026-4a87-abbe-4e81174d947e', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p042', 'Melanotan II 10mg', 0.50, 40.00, 20.00, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('2738030e-e06d-487c-8fea-9c0960d18f3f', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p003', 'Tirzepatide 15mg', 1.00, 80.00, 80.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('283d5ac3-1d3e-4857-b66d-2780671bf3cb', '0581d320-40f1-40e7-9adb-cd05ffaabda1', 'p108', 'Vilon 20mg', 1.00, 120.00, 120.00, '2026-03-18 20:20:09.024+00', '2026-03-18 20:20:09.024+00');
INSERT INTO public.order_line_items VALUES ('288f4d54-b9d0-4839-b2ba-f94dc4a57169', '05edc6e3-04b1-4487-bdda-898348202bfb', 'p017', 'Survodutide 10mg', 1.00, 170.00, 170.00, '2026-03-18 20:20:09.076+00', '2026-03-18 20:20:09.076+00');
INSERT INTO public.order_line_items VALUES ('28a99453-8ca2-431a-8b89-74dcd6fe5c01', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p089', 'KLOW (TB10+BPC10+KPV10+GHK50)', 1.00, 160.00, 160.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('297118df-50ef-48ab-b6a1-6b53879541d7', 'fb87ced5-8e31-4eaf-a3cd-64cba23b3188', 'p007', 'Tirzepatide 60mg', 2.00, 135.00, 270.00, '2026-03-18 20:20:08.924+00', '2026-03-18 20:20:08.924+00');
INSERT INTO public.order_line_items VALUES ('298d5e58-c3f4-4cfe-a64e-5185ec89a41c', 'a4cab9d2-7cb6-4f24-baa6-208f41bad4ca', 'p080', 'NAD+ 500mg', 1.00, 95.00, 95.00, '2026-03-18 20:20:08.905+00', '2026-03-18 20:20:08.905+00');
INSERT INTO public.order_line_items VALUES ('2aa851bf-d359-4f3c-957b-5d49b087d863', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p002', 'Tirzepatide 10mg', 1.00, 65.00, 65.00, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('2d3034cc-8ef2-4d18-aaab-a2f8d154b9c3', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p025', 'IGF-1 LR3 1mg', 1.00, 210.00, 210.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('2da837ef-1098-445e-b99a-509cc10b7fd7', 'c310cffd-47c0-4225-ade9-62923897b77f', 'p024', 'HGH 10IU', 2.00, 50.00, 100.00, '2026-03-18 20:20:08.899+00', '2026-03-18 20:20:08.899+00');
INSERT INTO public.order_line_items VALUES ('2dfc780b-5f3d-43ae-bf22-25177ef81468', '83a3d960-ba23-47a3-883c-ed6883ab9d27', 'p039', 'Epitalon 10mg', 1.00, 45.00, 45.00, '2026-03-18 20:20:09.071+00', '2026-03-18 20:20:09.071+00');
INSERT INTO public.order_line_items VALUES ('2f9bbe79-35cf-4db9-bf1d-9180d3ed14af', 'f7a805fd-f97e-4689-a011-2737dadc372f', 'p080', 'NAD+ 500mg', 1.00, 95.00, 95.00, '2026-03-18 20:20:08.959+00', '2026-03-18 20:20:08.959+00');
INSERT INTO public.order_line_items VALUES ('31cd4fa0-97c7-4f64-a7ef-93f85187955e', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p072', 'BPC 10mg / TB4 10mg Blend', 3.00, 135.00, 405.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('31e60a3c-7815-44c3-a951-987724b676e8', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p013', 'Retatrutide 50mg', 1.00, 205.00, 205.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('32a83f5d-c655-4f5a-9cd4-1f79dfcc79ae', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p012', 'Retatrutide 40mg', 2.00, 165.00, 330.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('335b7fd1-5ce6-47b6-9019-753c12aeb9fc', 'fb87ced5-8e31-4eaf-a3cd-64cba23b3188', 'p078', 'GHK-CU 100mg', 3.00, 51.00, 153.00, '2026-03-18 20:20:08.924+00', '2026-03-18 20:20:08.924+00');
INSERT INTO public.order_line_items VALUES ('3398f41e-ba84-4bc8-bd5b-422feea7835e', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p091', 'Ara-290 16mg', 2.00, 60.00, 120.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('35342a0e-6866-4fe2-bc2b-7c6e0d5973f0', 'ed8e0967-57d6-421d-906e-8ca68e8cc3ba', 'p089', 'KLOW (TB10+BPC10+KPV10+GHK50)', 1.00, 160.00, 160.00, '2026-03-18 20:20:09.062+00', '2026-03-18 20:20:09.062+00');
INSERT INTO public.order_line_items VALUES ('3676b54b-b871-44df-aeb7-49220f2e0f76', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p042', 'Melanotan II 10mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('36ae5ce2-da49-47c1-b9ce-b6ef92b7af23', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p052', 'Mots-C 20mg', 1.00, 95.00, 95.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('36af92ee-510d-4b2c-807c-5eeb41ed6ead', '9ece120d-7dbc-4009-ae0c-658d3d58b3d5', 'p097', 'HCG 2000 IU GMP 3ml 10vials', 1.00, 70.00, 70.00, '2026-03-18 20:20:09.057+00', '2026-03-18 20:20:09.057+00');
INSERT INTO public.order_line_items VALUES ('3717fc75-db90-4f40-9414-316c56786648', '813442f1-cfc6-45bc-9a82-3d1a63068328', 'p007', 'Tirzepatide 60mg', 1.00, 135.00, 135.00, '2026-03-18 20:20:09.046+00', '2026-03-18 20:20:09.046+00');
INSERT INTO public.order_line_items VALUES ('3995ca85-47d3-4840-a3d7-30b3a0327c8d', '813442f1-cfc6-45bc-9a82-3d1a63068328', 'p019', 'BAC water 10ml', 1.00, 25.00, 25.00, '2026-03-18 20:20:09.046+00', '2026-03-18 20:20:09.046+00');
INSERT INTO public.order_line_items VALUES ('3a47d1d3-a70b-4034-92e3-c350fb726bda', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p080', 'NAD+ 500mg', 1.00, 95.00, 95.00, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('3a661136-729b-428b-aeb8-7a13b92c3a20', '3a5df063-138c-4498-bef2-6d733ca93ea2', 'p007', 'Tirzepatide 60mg', 1.00, 135.00, 135.00, '2026-03-18 20:20:08.93+00', '2026-03-18 20:20:08.93+00');
INSERT INTO public.order_line_items VALUES ('3a9a5708-d9dc-4db2-881e-4281149d5159', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p011', 'Retatrutide 30mg', 1.00, 155.00, 155.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('3ab9a605-f248-4fa3-9de1-b2b44fff3965', 'c0a3135e-928e-4285-8916-e1f7ed71e04b', 'p014', 'Cagrilintide 5mg', 1.00, 90.00, 90.00, '2026-03-18 20:20:08.917+00', '2026-03-18 20:20:08.917+00');
INSERT INTO public.order_line_items VALUES ('3c3a64e9-a589-43ce-9814-09f0ff0b4537', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p062', 'Selank 10mg', 0.50, 55.00, 27.50, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('3ed0e231-d63b-4c61-b010-e17c74f5dc90', 'b0ca116d-aaea-4b84-9ae0-8cac8ad64280', 'p090', 'PE-22-28 10mg', 0.50, 70.00, 35.00, '2026-03-18 20:20:09.097+00', '2026-03-18 20:20:09.097+00');
INSERT INTO public.order_line_items VALUES ('436d8e7e-165a-427d-8588-d79ea3642cd0', '208c5098-466d-41e8-9f75-0218fbf1db3f', 'p073', 'CJC No DAC / Ipa 10/10mg', 1.00, 75.00, 75.00, '2026-03-18 20:20:09.013+00', '2026-03-18 20:20:09.013+00');
INSERT INTO public.order_line_items VALUES ('4497d20f-3d7f-4745-887c-663e197147df', '3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1', 'p007', 'Tirzepatide 60mg', 2.00, 135.00, 270.00, '2026-03-18 20:20:09.108+00', '2026-03-18 20:20:09.108+00');
INSERT INTO public.order_line_items VALUES ('463af238-9730-4bad-8817-77ad8bfe2bd8', '0581d320-40f1-40e7-9adb-cd05ffaabda1', 'p097', 'HCG 2000 IU GMP 3ml 10vials', 2.00, 70.00, 140.00, '2026-03-18 20:20:09.024+00', '2026-03-18 20:20:09.024+00');
INSERT INTO public.order_line_items VALUES ('467ce838-dfaf-480d-a34f-14696d6f7d0e', '0581d320-40f1-40e7-9adb-cd05ffaabda1', 'p024', 'HGH 10IU', 2.00, 50.00, 100.00, '2026-03-18 20:20:09.024+00', '2026-03-18 20:20:09.024+00');
INSERT INTO public.order_line_items VALUES ('4a08f43f-5e37-4006-81a9-598417d5687f', 'a22f7966-b42d-4cab-81c3-c94983f0e590', 'p050', 'Tesamorelin 20mg', 1.00, 220.00, 220.00, '2026-03-18 20:20:09.102+00', '2026-03-18 20:20:09.102+00');
INSERT INTO public.order_line_items VALUES ('4db20f36-809f-4155-bca7-9834b05e03ed', 'b096c66d-5870-4010-9511-45e13727908c', 'p009', 'Retatrutide 10mg', 1.00, 95.00, 95.00, '2026-03-18 20:20:08.995+00', '2026-03-18 20:20:08.995+00');
INSERT INTO public.order_line_items VALUES ('4ebf4f6c-d433-4097-961b-5fcdf6a20131', '7522e0b8-cf16-40ef-aff9-9b3180098433', 'p007', 'Tirzepatide 60mg', 1.00, 135.00, 135.00, '2026-03-18 20:20:09.018+00', '2026-03-18 20:20:09.018+00');
INSERT INTO public.order_line_items VALUES ('506127c0-9002-4a21-b240-3cc7f2e02d0d', '3a5df063-138c-4498-bef2-6d733ca93ea2', 'p109', 'Cartalax 20mg', 0.50, 120.00, 60.00, '2026-03-18 20:20:08.93+00', '2026-03-18 20:20:08.93+00');
INSERT INTO public.order_line_items VALUES ('529a5082-8455-4339-88b6-66fa63cb744d', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p011', 'Retatrutide 30mg', 1.00, 155.00, 155.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('52b41ae1-6a07-4ae5-a386-f889b287c21f', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p090', 'PE-22-28 10mg', 0.50, 70.00, 35.00, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('531a7bf9-b807-4f7c-9215-ea93e83932ce', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p030', 'BPC 157 10mg', 1.00, 45.00, 45.00, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('53a2235a-6b7a-4e83-889a-976072c835c9', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p052', 'Mots-C 20mg', 0.50, 95.00, 47.50, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('5a19e936-f7af-4dc0-839d-0cdbd9a283c7', 'f390e78f-35ca-4021-a236-a0c36532a061', 'p010', 'Retatrutide 20mg', 1.00, 120.00, 120.00, '2026-03-18 20:20:08.948+00', '2026-03-18 20:20:08.948+00');
INSERT INTO public.order_line_items VALUES ('5b84ecf0-7887-4cf9-bd64-1db73bf1104d', 'fff847e8-871c-423b-86c5-eddea6dfe217', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:08.936+00', '2026-03-18 20:20:08.936+00');
INSERT INTO public.order_line_items VALUES ('5b94425e-dfae-4fc1-ad17-faaf06c6057f', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p055', 'SS-31 30mg', 0.50, 155.00, 77.50, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('5e1e72ff-8372-452d-a141-8cad8d472337', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p024', 'HGH 10IU', 1.00, 50.00, 50.00, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('5e5eaee3-f0bb-40f8-a1e0-2d7c2d0cc915', '05edc6e3-04b1-4487-bdda-898348202bfb', 'p007', 'Tirzepatide 60mg', 3.00, 135.00, 405.00, '2026-03-18 20:20:09.076+00', '2026-03-18 20:20:09.076+00');
INSERT INTO public.order_line_items VALUES ('630a2eb6-9612-4bb2-beae-8e33255414e2', 'fb87ced5-8e31-4eaf-a3cd-64cba23b3188', 'p087', 'KPV & GHK-CU Blend', 1.00, 110.00, 110.00, '2026-03-18 20:20:08.924+00', '2026-03-18 20:20:08.924+00');
INSERT INTO public.order_line_items VALUES ('6541fc38-5675-4b95-842a-ffe3cc545d18', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p053', 'Mots-C 40mg', 1.00, 160.00, 160.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('674dca79-b63c-45f8-81e1-4c255a25c686', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p061', 'Semax 10mg', 1.00, 55.00, 55.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('68f99ced-a8d1-402b-926a-5288e929a8ff', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p010', 'Retatrutide 20mg', 4.00, 120.00, 480.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('69665197-fc4c-412b-89fc-42eca26a3907', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p102', 'Cerebrolysin 30mg GMP 10ml 10vials', 1.00, 45.00, 45.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('6e27ed2f-9a48-4926-8e07-d63d3387c100', 'e00b0557-6024-42ab-826c-31d5da1e3674', 'p019', 'BAC water 10ml', 1.00, 25.00, 25.00, '2026-03-18 20:20:09.091+00', '2026-03-18 20:20:09.091+00');
INSERT INTO public.order_line_items VALUES ('70dfb4c6-9266-43ea-b5d0-0f245bec62f7', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p110', 'Cortagen 20mg', 0.50, 120.00, 60.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('71c148d1-375a-45d9-943b-77abe1b67b6d', 'b096c66d-5870-4010-9511-45e13727908c', 'p071', 'BPC 5mg / TB4 5mg Blend', 1.00, 80.00, 80.00, '2026-03-18 20:20:08.995+00', '2026-03-18 20:20:08.995+00');
INSERT INTO public.order_line_items VALUES ('721dd180-da29-4ec0-84cb-97e72de84b7c', 'c310cffd-47c0-4225-ade9-62923897b77f', 'p102', 'Cerebrolysin 30mg GMP 10ml 10vials', 1.00, 45.00, 45.00, '2026-03-18 20:20:08.899+00', '2026-03-18 20:20:08.899+00');
INSERT INTO public.order_line_items VALUES ('72cec78b-bdc2-4386-a2f9-1aa14c505864', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p026', '5-Amino-1MQ 50mg', 1.00, 75.00, 75.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('749237e3-0766-423b-8ce1-4198c5043042', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p042', 'Melanotan II 10mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('74af5e3b-a5fb-4ecd-a0e4-3f225e277514', 'd9eff3e7-6d9b-4aac-a009-c49b0299b99c', 'p039', 'Epitalon 10mg', 1.00, 45.00, 45.00, '2026-03-18 20:20:08.911+00', '2026-03-18 20:20:08.911+00');
INSERT INTO public.order_line_items VALUES ('758a17cb-1138-41fa-ab67-df75f1cf6079', 'd9eff3e7-6d9b-4aac-a009-c49b0299b99c', 'p007', 'Tirzepatide 60mg', 0.50, 135.00, 67.50, '2026-03-18 20:20:08.911+00', '2026-03-18 20:20:08.911+00');
INSERT INTO public.order_line_items VALUES ('783246d1-b22a-4d1c-af27-df4def21790e', 'ece1625b-f1c1-48fc-827c-9a5978560ac7', 'p090', 'PE-22-28 10mg', 0.50, 70.00, 35.00, '2026-03-18 20:20:09.113+00', '2026-03-18 20:20:09.113+00');
INSERT INTO public.order_line_items VALUES ('7874567d-3ad3-4828-b92d-f1f70c925579', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p026', '5-Amino-1MQ 50mg', 1.00, 75.00, 75.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('7a3255ad-66ac-4d15-bdac-58128c50201e', 'a22f7966-b42d-4cab-81c3-c94983f0e590', 'p089', 'KLOW (TB10+BPC10+KPV10+GHK50)', 1.00, 160.00, 160.00, '2026-03-18 20:20:09.102+00', '2026-03-18 20:20:09.102+00');
INSERT INTO public.order_line_items VALUES ('7c2276ce-9007-48e7-b52c-b7dc7739a371', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p004', 'Tirzepatide 20mg', 1.00, 85.00, 85.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('7c4bf8e0-da61-447c-b605-33963e3e2840', '17b2c399-9bba-4740-8b1e-751b5baaa252', 'p079', 'GHK-CU 50mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:08.942+00', '2026-03-18 20:20:08.942+00');
INSERT INTO public.order_line_items VALUES ('7d641530-0275-4aef-983f-3dd95dfa3cba', 'f68aa4a8-ff01-405f-bcc0-963f4e8de0c7', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:08.883+00', '2026-03-18 20:20:08.883+00');
INSERT INTO public.order_line_items VALUES ('7fa8f370-53df-430e-a311-470d086b4e01', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p032', 'TB500 (TB4) 10mg', 1.00, 85.00, 85.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('83fd7430-6b9a-4d94-bccc-946d42af0d7a', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p031', 'BPC 157 40mg', 1.00, 160.00, 160.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('846d0b3d-25d7-4649-bdb1-fc6cab78802d', 'f5fb9f44-af87-40fc-b265-b91138f1f172', 'p052', 'Mots-C 20mg', 0.50, 95.00, 47.50, '2026-03-18 20:20:09.04+00', '2026-03-18 20:20:09.04+00');
INSERT INTO public.order_line_items VALUES ('85157133-dc6e-40ce-8d3b-8922af79ee9c', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p049', 'Tesamorelin 10mg', 1.00, 125.00, 125.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('88ebb81a-563b-4690-8966-8a784604a536', '03a194ac-176f-45d5-9f81-6a28e7f17c0c', 'p049', 'Tesamorelin 10mg', 1.00, 125.00, 125.00, '2026-03-18 20:20:09.035+00', '2026-03-18 20:20:09.035+00');
INSERT INTO public.order_line_items VALUES ('8bc8ee9f-0dde-4345-977d-fc441db95371', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p019', 'BAC water 10ml', 2.00, 25.00, 50.00, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('8cf64259-631a-473e-93a5-e71e30d95d3c', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p123', 'BPC 157 500mcg Tablets', 1.00, 55.00, 55.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('8eb0bc54-5eb5-4492-8a5f-af7f40603509', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p011', 'Retatrutide 30mg', 3.00, 155.00, 465.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('918c05a8-6fb0-4b25-aae6-3c3873e5c67a', '17b2c399-9bba-4740-8b1e-751b5baaa252', 'p089', 'KLOW (TB10+BPC10+KPV10+GHK50)', 0.50, 160.00, 80.00, '2026-03-18 20:20:08.942+00', '2026-03-18 20:20:08.942+00');
INSERT INTO public.order_line_items VALUES ('93266f18-1688-4af2-8523-8cd6a1de4439', 'fb87ced5-8e31-4eaf-a3cd-64cba23b3188', 'p012', 'Retatrutide 40mg', 2.00, 165.00, 330.00, '2026-03-18 20:20:08.924+00', '2026-03-18 20:20:08.924+00');
INSERT INTO public.order_line_items VALUES ('93a29017-8ee4-4e0e-ac96-443dff1326af', '83a3d960-ba23-47a3-883c-ed6883ab9d27', 'p012', 'Retatrutide 40mg', 2.00, 165.00, 330.00, '2026-03-18 20:20:09.071+00', '2026-03-18 20:20:09.071+00');
INSERT INTO public.order_line_items VALUES ('944c6819-dd48-4390-a859-9cd87f2a848d', '3b7280a7-b855-489a-b9d1-b2f03e5f3d0b', 'p051', 'Mots-C 10mg', 1.00, 55.00, 55.00, '2026-03-18 20:20:09.051+00', '2026-03-18 20:20:09.051+00');
INSERT INTO public.order_line_items VALUES ('94d844e8-d6ac-44f5-be03-f7877ed4a064', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('954155c8-bd14-4ba7-b09c-9f42adb932b3', '208c5098-466d-41e8-9f75-0218fbf1db3f', 'p026', '5-Amino-1MQ 50mg', 5.00, 75.00, 375.00, '2026-03-18 20:20:09.013+00', '2026-03-18 20:20:09.013+00');
INSERT INTO public.order_line_items VALUES ('955e7ade-bd21-4656-80a2-720f39f892c1', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p079', 'GHK-CU 50mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('97d57a13-dcf5-4a55-b17e-fcfd6e9daac5', 'c0a3135e-928e-4285-8916-e1f7ed71e04b', 'p072', 'BPC 10mg / TB4 10mg Blend', 1.00, 135.00, 135.00, '2026-03-18 20:20:08.917+00', '2026-03-18 20:20:08.917+00');
INSERT INTO public.order_line_items VALUES ('9e403f54-0e8a-4303-95a1-8766629c8c46', '83a3d960-ba23-47a3-883c-ed6883ab9d27', 'p042', 'Melanotan II 10mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:09.071+00', '2026-03-18 20:20:09.071+00');
INSERT INTO public.order_line_items VALUES ('a2940f8c-aa51-4b05-befe-a6e8bbccd181', '3b7280a7-b855-489a-b9d1-b2f03e5f3d0b', 'p109', 'Cartalax 20mg', 1.00, 120.00, 120.00, '2026-03-18 20:20:09.051+00', '2026-03-18 20:20:09.051+00');
INSERT INTO public.order_line_items VALUES ('a4ec4060-66cd-4b3c-9e70-d6f481d032fb', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p049', 'Tesamorelin 10mg', 1.00, 125.00, 125.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('a509cc59-36d7-40bb-b42c-615eaf034766', '17b2c399-9bba-4740-8b1e-751b5baaa252', 'p006', 'Tirzepatide 45mg', 1.00, 115.00, 115.00, '2026-03-18 20:20:08.942+00', '2026-03-18 20:20:08.942+00');
INSERT INTO public.order_line_items VALUES ('a6f8bdc5-ba4f-48d1-8766-97c02a94aa2c', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p014', 'Cagrilintide 5mg', 0.50, 90.00, 45.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('a7db29e4-90d7-49ec-96f7-7d055e648f9b', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p053', 'Mots-C 40mg', 1.00, 160.00, 160.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('a91f7909-ef84-4699-8ed2-753709de49fc', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p067', 'Oxytocin 10mg (<99)', 1.00, 60.00, 60.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('ad3c53c6-dad3-4722-8bb2-9c0ade59309f', 'b096c66d-5870-4010-9511-45e13727908c', 'p019', 'BAC water 10ml', 3.00, 25.00, 75.00, '2026-03-18 20:20:08.995+00', '2026-03-18 20:20:08.995+00');
INSERT INTO public.order_line_items VALUES ('b6bfb637-30bb-4e5b-b7c6-2daaa13c9699', 'f68aa4a8-ff01-405f-bcc0-963f4e8de0c7', 'p109', 'Cartalax 20mg', 1.50, 120.00, 180.00, '2026-03-18 20:20:08.883+00', '2026-03-18 20:20:08.883+00');
INSERT INTO public.order_line_items VALUES ('b7a0f4e0-4502-4f2c-a936-b03b820ee04e', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p021', 'BAC water 3ml', 3.00, 15.00, 45.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('b87241c2-7953-47fc-8beb-146c75203367', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p008', 'Tirzepatide 100mg', 1.00, 220.00, 220.00, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('befb8340-265b-4cc0-bdf7-4608633e239d', 'c675f7ec-5f9d-436a-afbd-fff7a1d4621a', 'p076', 'Tesa 10mg / Ipa 3mg Blend', 1.00, 165.00, 165.00, '2026-03-18 20:20:08.965+00', '2026-03-18 20:20:08.965+00');
INSERT INTO public.order_line_items VALUES ('c11a01e6-ffbf-4cc4-ba22-3c773505cb1c', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p019', 'BAC water 10ml', 1.00, 25.00, 25.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('c1f91a21-76ed-4bdb-8f50-64408cee2c10', '1b975899-08c0-439c-b0bb-b65f0092d0aa', 'p062', 'Selank 10mg', 1.00, 55.00, 55.00, '2026-03-18 20:20:08.954+00', '2026-03-18 20:20:08.954+00');
INSERT INTO public.order_line_items VALUES ('c4b7bd2e-a796-4754-beb8-dbf38afe4a7e', 'f5fb9f44-af87-40fc-b265-b91138f1f172', 'p055', 'SS-31 30mg', 0.50, 155.00, 77.50, '2026-03-18 20:20:09.04+00', '2026-03-18 20:20:09.04+00');
INSERT INTO public.order_line_items VALUES ('c55b6727-95dd-4d29-a2fe-b90f74fc3a4a', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p055', 'SS-31 30mg', 1.00, 155.00, 155.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('c65644f8-2054-40d0-872e-d92cc7d8fbf7', '1b975899-08c0-439c-b0bb-b65f0092d0aa', 'p090', 'PE-22-28 10mg', 1.00, 70.00, 70.00, '2026-03-18 20:20:08.954+00', '2026-03-18 20:20:08.954+00');
INSERT INTO public.order_line_items VALUES ('c74a1076-84f6-41f3-8625-5105daff5647', 'bfd2166a-c2df-46bd-a127-570af936afc7', 'p046', 'Tesa / IPA / CJC No DAC 6/3/3mg', 2.00, 130.00, 260.00, '2026-03-18 20:20:08.983+00', '2026-03-18 20:20:08.983+00');
INSERT INTO public.order_line_items VALUES ('c9c8bda6-1c62-4c02-8057-8493876413e9', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p089', 'KLOW (TB10+BPC10+KPV10+GHK50)', 0.50, 160.00, 80.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('cc875248-3c48-420e-ac31-2f53957d2e0a', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p085', 'KPV 30mg', 0.50, 145.00, 72.50, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('cfda829d-bc71-40f7-87b3-36ccbd1a20cd', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p054', 'SS-31 10mg', 1.00, 75.00, 75.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('d0e1abbb-95bd-415e-aecb-909d68373174', '17b2c399-9bba-4740-8b1e-751b5baaa252', 'p010', 'Retatrutide 20mg', 3.00, 120.00, 360.00, '2026-03-18 20:20:08.942+00', '2026-03-18 20:20:08.942+00');
INSERT INTO public.order_line_items VALUES ('d16aa82d-4929-4c7f-9902-2d0036735250', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p068', 'Snap-8 10mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('d18053b9-21f8-4683-b213-d65d8b44f141', 'c0a3135e-928e-4285-8916-e1f7ed71e04b', 'p126', 'Orforglipron 12mg', 1.00, 130.00, 130.00, '2026-03-18 20:20:08.917+00', '2026-03-18 20:20:08.917+00');
INSERT INTO public.order_line_items VALUES ('d1d90f08-f521-4028-a09e-c163006263c6', 'e00b0557-6024-42ab-826c-31d5da1e3674', 'p024', 'HGH 10IU', 1.00, 50.00, 50.00, '2026-03-18 20:20:09.091+00', '2026-03-18 20:20:09.091+00');
INSERT INTO public.order_line_items VALUES ('d1e6115c-37e1-4402-b090-6887f2bffc8c', '3b7280a7-b855-489a-b9d1-b2f03e5f3d0b', 'p030', 'BPC 157 10mg', 1.00, 45.00, 45.00, '2026-03-18 20:20:09.051+00', '2026-03-18 20:20:09.051+00');
INSERT INTO public.order_line_items VALUES ('d1ee2543-b10f-4533-a269-b35ae42e070c', '9ece120d-7dbc-4009-ae0c-658d3d58b3d5', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:09.057+00', '2026-03-18 20:20:09.057+00');
INSERT INTO public.order_line_items VALUES ('d250f872-21ae-4a0a-aac3-f6e1fecfd59d', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p036', 'Fragment 176-191 5mg', 1.00, 75.00, 75.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('d32ef927-053a-42d9-a837-ddeda278fac9', '83a3d960-ba23-47a3-883c-ed6883ab9d27', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:09.071+00', '2026-03-18 20:20:09.071+00');
INSERT INTO public.order_line_items VALUES ('d81e5e73-4c39-4782-9ca6-a395cc516d30', '7522e0b8-cf16-40ef-aff9-9b3180098433', 'p019', 'BAC water 10ml', 1.00, 25.00, 25.00, '2026-03-18 20:20:09.018+00', '2026-03-18 20:20:09.018+00');
INSERT INTO public.order_line_items VALUES ('da05a714-7aa6-4f48-b89f-ea95000bbb5f', 'a434d697-4ad9-481d-8b13-74d343cd9590', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:09.081+00', '2026-03-18 20:20:09.081+00');
INSERT INTO public.order_line_items VALUES ('dec28f3e-f161-42d6-96d1-d2906ec4ed43', 'd9eff3e7-6d9b-4aac-a009-c49b0299b99c', 'p005', 'Tirzepatide 30mg', 1.00, 90.00, 90.00, '2026-03-18 20:20:08.911+00', '2026-03-18 20:20:08.911+00');
INSERT INTO public.order_line_items VALUES ('e00537ac-ad5a-4b2f-b4d9-5831c512f4d6', 'fff847e8-871c-423b-86c5-eddea6dfe217', 'p013', 'Retatrutide 50mg', 2.00, 205.00, 410.00, '2026-03-18 20:20:08.936+00', '2026-03-18 20:20:08.936+00');
INSERT INTO public.order_line_items VALUES ('e010074b-c51b-4b47-9081-dce4bccb89e3', 'a22f7966-b42d-4cab-81c3-c94983f0e590', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:09.102+00', '2026-03-18 20:20:09.102+00');
INSERT INTO public.order_line_items VALUES ('e1df1e8a-85a2-441e-aef1-a62ab01f6f29', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p051', 'Mots-C 10mg', 1.00, 55.00, 55.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('e417badd-677e-4ca9-82a1-9db38896f485', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p042', 'Melanotan II 10mg', 1.00, 40.00, 40.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('e4611f37-a713-4cf5-a0df-c8d59e8553db', '0581d320-40f1-40e7-9adb-cd05ffaabda1', 'p106', 'Vesugen 20mg', 1.00, 120.00, 120.00, '2026-03-18 20:20:09.024+00', '2026-03-18 20:20:09.024+00');
INSERT INTO public.order_line_items VALUES ('e4e7f8f8-ed4a-473b-bf53-5e836cb66029', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p006', 'Tirzepatide 45mg', 1.00, 115.00, 115.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('e8002e9d-0d34-4421-889d-cf37e568ccec', 'c67237d3-15ca-4487-b138-43c30d2e1df0', 'p005', 'Tirzepatide 30mg', 1.00, 90.00, 90.00, '2026-03-18 20:20:08.877+00', '2026-03-18 20:20:08.877+00');
INSERT INTO public.order_line_items VALUES ('ec7ee4fb-8cd9-4483-b0ce-5e36759b028f', 'b0ca116d-aaea-4b84-9ae0-8cac8ad64280', 'p052', 'Mots-C 20mg', 1.00, 95.00, 95.00, '2026-03-18 20:20:09.097+00', '2026-03-18 20:20:09.097+00');
INSERT INTO public.order_line_items VALUES ('ed15f7e7-bb36-4987-b687-41a70709d565', '7d6339fe-0e7e-4f13-a613-9964a321e863', 'p119', 'GHK-CU 10g Raw', 1.00, 85.00, 85.00, '2026-03-18 20:20:09.086+00', '2026-03-18 20:20:09.086+00');
INSERT INTO public.order_line_items VALUES ('f026ec8c-bc6a-4dd9-b16b-087a9407fd86', '3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4', 'p012', 'Retatrutide 40mg', 2.00, 165.00, 330.00, '2026-03-18 20:20:08.891+00', '2026-03-18 20:20:08.891+00');
INSERT INTO public.order_line_items VALUES ('f3ca65c8-340b-44c7-a344-3d2f199d752c', 'af9e5b89-b039-4746-93be-5e2c9cf2dddd', 'p078', 'GHK-CU 100mg', 1.00, 51.00, 51.00, '2026-03-18 20:20:09.007+00', '2026-03-18 20:20:09.007+00');
INSERT INTO public.order_line_items VALUES ('f3fbba4f-7b22-49db-961c-4b28a2d8fa63', 'cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca', 'p061', 'Semax 10mg', 0.50, 55.00, 27.50, '2026-03-18 20:20:09.029+00', '2026-03-18 20:20:09.029+00');
INSERT INTO public.order_line_items VALUES ('f4370256-1043-4069-9acd-cb632beedc90', 'fff847e8-871c-423b-86c5-eddea6dfe217', 'p014', 'Cagrilintide 5mg', 1.00, 90.00, 90.00, '2026-03-18 20:20:08.936+00', '2026-03-18 20:20:08.936+00');
INSERT INTO public.order_line_items VALUES ('f625774e-90be-4121-814e-39a14a04ac60', 'bfd2166a-c2df-46bd-a127-570af936afc7', 'p050', 'Tesamorelin 20mg', 1.00, 220.00, 220.00, '2026-03-18 20:20:08.983+00', '2026-03-18 20:20:08.983+00');
INSERT INTO public.order_line_items VALUES ('f9458a5e-5d45-4d47-b665-f725f9f5c00a', '7522e0b8-cf16-40ef-aff9-9b3180098433', 'p012', 'Retatrutide 40mg', 1.00, 165.00, 165.00, '2026-03-18 20:20:09.018+00', '2026-03-18 20:20:09.018+00');
INSERT INTO public.order_line_items VALUES ('fc2c18a1-e553-4b40-96b8-8f82e1b0adbe', '8fee86d5-5f56-462a-bc6f-354c2bcdc90e', 'p030', 'BPC 157 10mg', 1.00, 45.00, 45.00, '2026-03-18 20:20:08.973+00', '2026-03-18 20:20:08.973+00');
INSERT INTO public.order_line_items VALUES ('fe14de42-20d7-45d8-bdae-e8a9077c618e', '1b975899-08c0-439c-b0bb-b65f0092d0aa', 'p061', 'Semax 10mg', 1.00, 55.00, 55.00, '2026-03-18 20:20:08.954+00', '2026-03-18 20:20:08.954+00');
INSERT INTO public.order_line_items VALUES ('fe5c45ec-e5bf-4c9c-ac53-114322afcb86', 'd25da38b-20aa-40ff-ba34-e1638b380836', 'p007', 'Tirzepatide 60mg', 1.00, 135.00, 135.00, '2026-03-18 20:20:08.989+00', '2026-03-18 20:20:08.989+00');
INSERT INTO public.order_line_items VALUES ('fe6938ae-f327-4929-8618-851d64fe2764', '83a3d960-ba23-47a3-883c-ed6883ab9d27', 'p028', 'Adipotide 10mg', 1.00, 165.00, 165.00, '2026-03-18 20:20:09.071+00', '2026-03-18 20:20:09.071+00');
INSERT INTO public.order_line_items VALUES ('e67e0821-3cf1-46a7-946c-1c0b72c308d2', '6f6de2e0-09fd-4ba9-a538-07683263fd23', '', 'Retatrutide 30mg', 2.00, 155.00, 310.00, '2026-03-19 15:35:27.558303+00', '2026-03-19 15:35:27.558303+00');
INSERT INTO public.order_line_items VALUES ('ae9a0b32-7b03-4d6b-8bb4-8dd0af82a0bd', 'b3a84822-5580-47c7-bfe0-7b61f1908c05', '', 'Tirzepatide 20mg', 0.50, 85.00, 42.50, '2026-03-19 17:01:58.219637+00', '2026-03-19 17:01:58.219637+00');
INSERT INTO public.order_line_items VALUES ('a9a650e4-058f-44e0-b639-6b833476eea5', 'b3a84822-5580-47c7-bfe0-7b61f1908c05', '', 'Tirzepatide 15mg', 1.00, 80.00, 80.00, '2026-03-19 17:01:58.219637+00', '2026-03-19 17:01:58.219637+00');
INSERT INTO public.order_line_items VALUES ('e7fb87d0-b18b-4b50-915c-33c19c0c11fd', '7c4198b0-56ca-4561-a79e-9b04debe3cf9', '', 'Tirzepatide 15mg', 1.00, 80.00, 80.00, '2026-03-19 17:02:22.408055+00', '2026-03-19 17:02:22.408055+00');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products VALUES ('p001', 'Semaglutide 10mg', 55.00, true, NULL, 1, '2026-03-18 15:19:10.669+00', '2026-03-18 16:36:48.221+00');
INSERT INTO public.products VALUES ('p002', 'Tirzepatide 10mg', 65.00, true, NULL, 2, '2026-03-18 15:19:10.673+00', '2026-03-18 16:36:48.224+00');
INSERT INTO public.products VALUES ('p003', 'Tirzepatide 15mg', 80.00, true, NULL, 3, '2026-03-18 15:19:10.675+00', '2026-03-18 15:19:10.675+00');
INSERT INTO public.products VALUES ('p004', 'Tirzepatide 20mg', 85.00, true, NULL, 4, '2026-03-18 15:19:10.678+00', '2026-03-18 15:19:10.678+00');
INSERT INTO public.products VALUES ('p005', 'Tirzepatide 30mg', 90.00, true, NULL, 5, '2026-03-18 15:19:10.682+00', '2026-03-18 15:19:10.682+00');
INSERT INTO public.products VALUES ('p006', 'Tirzepatide 45mg', 115.00, true, NULL, 6, '2026-03-18 15:19:10.685+00', '2026-03-18 15:19:10.685+00');
INSERT INTO public.products VALUES ('p007', 'Tirzepatide 60mg', 135.00, true, NULL, 7, '2026-03-18 15:19:10.688+00', '2026-03-18 15:19:10.688+00');
INSERT INTO public.products VALUES ('p008', 'Tirzepatide 100mg', 220.00, true, NULL, 8, '2026-03-18 15:19:10.691+00', '2026-03-18 15:19:10.691+00');
INSERT INTO public.products VALUES ('p009', 'Retatrutide 10mg', 95.00, true, NULL, 9, '2026-03-18 15:19:10.694+00', '2026-03-18 15:19:10.694+00');
INSERT INTO public.products VALUES ('p010', 'Retatrutide 20mg', 120.00, true, NULL, 10, '2026-03-18 15:19:10.697+00', '2026-03-18 15:19:10.697+00');
INSERT INTO public.products VALUES ('p011', 'Retatrutide 30mg', 155.00, true, NULL, 11, '2026-03-18 15:19:10.7+00', '2026-03-18 15:19:10.7+00');
INSERT INTO public.products VALUES ('p012', 'Retatrutide 40mg', 165.00, true, NULL, 12, '2026-03-18 15:19:10.703+00', '2026-03-18 15:19:10.703+00');
INSERT INTO public.products VALUES ('p013', 'Retatrutide 50mg', 205.00, true, NULL, 13, '2026-03-18 15:19:10.706+00', '2026-03-18 15:19:10.706+00');
INSERT INTO public.products VALUES ('p014', 'Cagrilintide 5mg', 90.00, true, NULL, 14, '2026-03-18 15:19:10.709+00', '2026-03-18 15:19:10.709+00');
INSERT INTO public.products VALUES ('p015', 'Cagrilintide 10mg', 170.00, true, NULL, 15, '2026-03-18 15:19:10.711+00', '2026-03-18 15:19:10.711+00');
INSERT INTO public.products VALUES ('p016', 'Mazdutide 10mg', 160.00, true, NULL, 16, '2026-03-18 15:19:10.713+00', '2026-03-18 15:19:10.713+00');
INSERT INTO public.products VALUES ('p017', 'Survodutide 10mg', 170.00, true, NULL, 17, '2026-03-18 15:19:10.716+00', '2026-03-18 15:19:10.716+00');
INSERT INTO public.products VALUES ('p018', 'GAC water 10ml', 25.00, true, NULL, 18, '2026-03-18 15:19:10.719+00', '2026-03-18 15:19:10.719+00');
INSERT INTO public.products VALUES ('p019', 'BAC water 10ml', 25.00, true, NULL, 19, '2026-03-18 15:19:10.721+00', '2026-03-18 15:19:10.721+00');
INSERT INTO public.products VALUES ('p020', 'GAC water 3ml', 15.00, true, NULL, 20, '2026-03-18 15:19:10.724+00', '2026-03-18 15:19:10.724+00');
INSERT INTO public.products VALUES ('p021', 'BAC water 3ml', 15.00, true, NULL, 21, '2026-03-18 15:19:10.727+00', '2026-03-18 15:19:10.727+00');
INSERT INTO public.products VALUES ('p022', 'L-Carnitine 500mg×20ml×10vials Water', 160.00, true, NULL, 22, '2026-03-18 15:19:10.729+00', '2026-03-18 15:19:10.729+00');
INSERT INTO public.products VALUES ('p023', 'Cyanocobalamin B12 1mg ×10ml×10vials water', 60.00, true, NULL, 23, '2026-03-18 15:19:10.732+00', '2026-03-18 15:19:10.732+00');
INSERT INTO public.products VALUES ('p024', 'HGH 10IU', 50.00, true, NULL, 24, '2026-03-18 15:19:10.735+00', '2026-03-18 15:19:10.735+00');
INSERT INTO public.products VALUES ('p025', 'IGF-1 LR3 1mg', 210.00, true, NULL, 25, '2026-03-18 15:19:10.738+00', '2026-03-18 15:19:10.738+00');
INSERT INTO public.products VALUES ('p026', '5-Amino-1MQ 50mg', 75.00, true, NULL, 26, '2026-03-18 15:19:10.74+00', '2026-03-18 15:19:10.74+00');
INSERT INTO public.products VALUES ('p027', '5-Amino-1MQ 10mg', 55.00, true, NULL, 27, '2026-03-18 15:19:10.743+00', '2026-03-18 15:19:10.743+00');
INSERT INTO public.products VALUES ('p028', 'Adipotide 10mg', 165.00, true, NULL, 28, '2026-03-18 15:19:10.746+00', '2026-03-18 15:19:10.746+00');
INSERT INTO public.products VALUES ('p029', 'VIP 10mg', 125.00, true, NULL, 29, '2026-03-18 15:19:10.749+00', '2026-03-18 15:19:10.749+00');
INSERT INTO public.products VALUES ('p030', 'BPC 157 10mg', 45.00, true, NULL, 30, '2026-03-18 15:19:10.751+00', '2026-03-18 15:19:10.751+00');
INSERT INTO public.products VALUES ('p031', 'BPC 157 40mg', 160.00, true, NULL, 31, '2026-03-18 15:19:10.754+00', '2026-03-18 15:19:10.754+00');
INSERT INTO public.products VALUES ('p032', 'TB500 (TB4) 10mg', 85.00, true, NULL, 32, '2026-03-18 15:19:10.756+00', '2026-03-18 15:19:10.756+00');
INSERT INTO public.products VALUES ('p033', 'TB500 (TB4) 20mg', 165.00, true, NULL, 33, '2026-03-18 15:19:10.759+00', '2026-03-18 15:19:10.759+00');
INSERT INTO public.products VALUES ('p034', 'Abaloparatide 3mg', 100.00, true, NULL, 34, '2026-03-18 15:19:10.762+00', '2026-03-18 15:19:10.762+00');
INSERT INTO public.products VALUES ('p035', 'Teriparatide 750mcg', 75.00, true, NULL, 35, '2026-03-18 15:19:10.765+00', '2026-03-18 15:19:10.765+00');
INSERT INTO public.products VALUES ('p036', 'Fragment 176-191 5mg', 75.00, true, NULL, 36, '2026-03-18 15:19:10.773+00', '2026-03-18 15:19:10.773+00');
INSERT INTO public.products VALUES ('p037', 'PT141 10mg', 60.00, true, NULL, 37, '2026-03-18 15:19:10.776+00', '2026-03-18 15:19:10.776+00');
INSERT INTO public.products VALUES ('p038', 'Kisspeptin 10mg', 70.00, true, NULL, 38, '2026-03-18 15:19:10.779+00', '2026-03-18 15:19:10.779+00');
INSERT INTO public.products VALUES ('p039', 'Epitalon 10mg', 45.00, true, NULL, 39, '2026-03-18 15:19:10.782+00', '2026-03-18 15:19:10.782+00');
INSERT INTO public.products VALUES ('p040', 'Epitalon 50mg', 200.00, true, NULL, 40, '2026-03-18 15:19:10.784+00', '2026-03-18 15:19:10.784+00');
INSERT INTO public.products VALUES ('p041', 'N-Acetyl Epitalon 20mg', 110.00, true, NULL, 41, '2026-03-18 15:19:10.787+00', '2026-03-18 15:19:10.787+00');
INSERT INTO public.products VALUES ('p042', 'Melanotan II 10mg', 40.00, true, NULL, 42, '2026-03-18 15:19:10.79+00', '2026-03-18 15:19:10.79+00');
INSERT INTO public.products VALUES ('p043', 'Melanotan I 10mg', 50.00, true, NULL, 43, '2026-03-18 15:19:10.792+00', '2026-03-18 15:19:10.792+00');
INSERT INTO public.products VALUES ('p044', 'CJC-1295 with DAC 5mg', 120.00, true, NULL, 44, '2026-03-18 15:19:10.794+00', '2026-03-18 15:19:10.794+00');
INSERT INTO public.products VALUES ('p045', 'CJC-1295 No DAC 10mg', 140.00, true, NULL, 45, '2026-03-18 15:19:10.797+00', '2026-03-18 15:19:10.797+00');
INSERT INTO public.products VALUES ('p046', 'Tesa / IPA / CJC No DAC 6/3/3mg', 130.00, true, NULL, 46, '2026-03-18 15:19:10.8+00', '2026-03-18 15:19:10.8+00');
INSERT INTO public.products VALUES ('p047', 'GHRP-6 10mg', 50.00, true, NULL, 47, '2026-03-18 15:19:10.802+00', '2026-03-18 15:19:10.802+00');
INSERT INTO public.products VALUES ('p048', 'GHRP-2 10mg', 50.00, true, NULL, 48, '2026-03-18 15:19:10.805+00', '2026-03-18 15:19:10.805+00');
INSERT INTO public.products VALUES ('p049', 'Tesamorelin 10mg', 125.00, true, NULL, 49, '2026-03-18 15:19:10.808+00', '2026-03-18 15:19:10.808+00');
INSERT INTO public.products VALUES ('p050', 'Tesamorelin 20mg', 220.00, true, NULL, 50, '2026-03-18 15:19:10.811+00', '2026-03-18 15:19:10.811+00');
INSERT INTO public.products VALUES ('p051', 'Mots-C 10mg', 55.00, true, NULL, 51, '2026-03-18 15:19:10.814+00', '2026-03-18 15:19:10.814+00');
INSERT INTO public.products VALUES ('p052', 'Mots-C 20mg', 95.00, true, NULL, 52, '2026-03-18 15:19:10.817+00', '2026-03-18 15:19:10.817+00');
INSERT INTO public.products VALUES ('p053', 'Mots-C 40mg', 160.00, true, NULL, 53, '2026-03-18 15:19:10.82+00', '2026-03-18 15:19:10.82+00');
INSERT INTO public.products VALUES ('p054', 'SS-31 10mg', 75.00, true, NULL, 54, '2026-03-18 15:19:10.823+00', '2026-03-18 15:19:10.823+00');
INSERT INTO public.products VALUES ('p055', 'SS-31 30mg', 155.00, true, NULL, 55, '2026-03-18 15:19:10.826+00', '2026-03-18 15:19:10.826+00');
INSERT INTO public.products VALUES ('p056', 'SS-31 50mg', 230.00, true, NULL, 56, '2026-03-18 15:19:10.828+00', '2026-03-18 15:19:10.828+00');
INSERT INTO public.products VALUES ('p057', 'Ipamorelin 10mg', 80.00, true, NULL, 57, '2026-03-18 15:19:10.831+00', '2026-03-18 15:19:10.831+00');
INSERT INTO public.products VALUES ('p058', 'Thymosin Alpha-1 10mg', 125.00, true, NULL, 58, '2026-03-18 15:19:10.834+00', '2026-03-18 15:19:10.834+00');
INSERT INTO public.products VALUES ('p059', 'Thymulin 20mg', 100.00, true, NULL, 59, '2026-03-18 15:19:10.836+00', '2026-03-18 15:19:10.836+00');
INSERT INTO public.products VALUES ('p060', 'Adamax 10mg (1032 da)', 250.00, true, NULL, 60, '2026-03-18 15:19:10.838+00', '2026-03-18 15:19:10.838+00');
INSERT INTO public.products VALUES ('p061', 'Semax 10mg', 55.00, true, NULL, 61, '2026-03-18 15:19:10.842+00', '2026-03-18 15:19:10.842+00');
INSERT INTO public.products VALUES ('p062', 'Selank 10mg', 55.00, true, NULL, 62, '2026-03-18 15:19:10.845+00', '2026-03-18 15:19:10.845+00');
INSERT INTO public.products VALUES ('p063', 'Na Semax', 70.00, true, NULL, 63, '2026-03-18 15:19:10.848+00', '2026-03-18 15:19:10.848+00');
INSERT INTO public.products VALUES ('p064', 'Na Selank', 70.00, true, NULL, 64, '2026-03-18 15:19:10.851+00', '2026-03-18 15:19:10.851+00');
INSERT INTO public.products VALUES ('p065', 'IllumiNeuro (PE10mg+Pinealon 10mg+Na Semax 20mg+Na Selank 8mg)', 240.00, true, NULL, 65, '2026-03-18 15:19:10.854+00', '2026-03-18 15:19:10.854+00');
INSERT INTO public.products VALUES ('p066', 'Fox04 10mg', 300.00, true, NULL, 66, '2026-03-18 15:19:10.856+00', '2026-03-18 15:19:10.856+00');
INSERT INTO public.products VALUES ('p067', 'Oxytocin 10mg (<99)', 60.00, true, NULL, 67, '2026-03-18 15:19:10.859+00', '2026-03-18 15:19:10.859+00');
INSERT INTO public.products VALUES ('p068', 'Snap-8 10mg', 40.00, true, NULL, 68, '2026-03-18 15:19:10.862+00', '2026-03-18 15:19:10.862+00');
INSERT INTO public.products VALUES ('p069', 'DSIP 5mg', 35.00, true, NULL, 69, '2026-03-18 15:19:10.865+00', '2026-03-18 15:19:10.865+00');
INSERT INTO public.products VALUES ('p070', 'DSIP 10mg', 65.00, true, NULL, 70, '2026-03-18 15:19:10.868+00', '2026-03-18 15:19:10.868+00');
INSERT INTO public.products VALUES ('p071', 'BPC 5mg / TB4 5mg Blend', 80.00, true, NULL, 71, '2026-03-18 15:19:10.871+00', '2026-03-18 15:19:10.871+00');
INSERT INTO public.products VALUES ('p072', 'BPC 10mg / TB4 10mg Blend', 135.00, true, NULL, 72, '2026-03-18 15:19:10.874+00', '2026-03-18 15:19:10.874+00');
INSERT INTO public.products VALUES ('p073', 'CJC No DAC / Ipa 5/5mg', 75.00, true, NULL, 73, '2026-03-18 15:19:10.886+00', '2026-03-18 15:19:10.886+00');
INSERT INTO public.products VALUES ('p074', 'CJC 6mg / Ipa 11mg Blend', 160.00, true, NULL, 74, '2026-03-18 15:19:10.888+00', '2026-03-18 15:19:10.888+00');
INSERT INTO public.products VALUES ('p075', 'Tesa 5mg / Ipa 5mg Blend', 110.00, true, NULL, 75, '2026-03-18 15:19:10.891+00', '2026-03-18 15:19:10.891+00');
INSERT INTO public.products VALUES ('p076', 'Tesa 10mg / Ipa 3mg Blend', 165.00, true, NULL, 76, '2026-03-18 15:19:10.893+00', '2026-03-18 15:19:10.893+00');
INSERT INTO public.products VALUES ('p077', 'AHK-CU 100mg', 60.00, true, NULL, 77, '2026-03-18 15:19:10.896+00', '2026-03-18 15:19:10.896+00');
INSERT INTO public.products VALUES ('p078', 'GHK-CU 100mg', 51.00, true, NULL, 78, '2026-03-18 15:19:10.899+00', '2026-03-18 15:19:10.899+00');
INSERT INTO public.products VALUES ('p079', 'GHK-CU 50mg', 40.00, true, NULL, 79, '2026-03-18 15:19:10.902+00', '2026-03-18 15:19:10.902+00');
INSERT INTO public.products VALUES ('p080', 'NAD+ 500mg Buffer pH6-6.5', 95.00, true, NULL, 80, '2026-03-18 15:19:10.905+00', '2026-03-18 15:19:10.905+00');
INSERT INTO public.products VALUES ('p081', 'TB500 Frag 10mg', 70.00, true, NULL, 81, '2026-03-18 15:19:10.908+00', '2026-03-18 15:19:10.908+00');
INSERT INTO public.products VALUES ('p082', 'PNC 27 30mg (this batch 28mg)', 240.00, true, NULL, 82, '2026-03-18 15:19:10.91+00', '2026-03-18 15:19:10.91+00');
INSERT INTO public.products VALUES ('p083', 'LL-37 5mg', 85.00, true, NULL, 83, '2026-03-18 15:19:10.913+00', '2026-03-18 15:19:10.913+00');
INSERT INTO public.products VALUES ('p084', 'KPV 10mg', 60.00, true, NULL, 84, '2026-03-18 15:19:10.915+00', '2026-03-18 15:19:10.915+00');
INSERT INTO public.products VALUES ('p085', 'KPV 30mg', 145.00, true, NULL, 85, '2026-03-18 15:19:10.918+00', '2026-03-18 15:19:10.918+00');
INSERT INTO public.products VALUES ('p086', 'Sermorelin 5mg', 70.00, true, NULL, 86, '2026-03-18 15:19:10.921+00', '2026-03-18 15:19:10.921+00');
INSERT INTO public.products VALUES ('p087', 'KPV & GHK-CU Blend', 110.00, true, NULL, 87, '2026-03-18 15:19:10.923+00', '2026-03-18 15:19:10.923+00');
INSERT INTO public.products VALUES ('p088', 'GLOW (TB4 10mg + BPC 10mg + GHK 50mg)', 135.00, true, NULL, 88, '2026-03-18 15:19:10.926+00', '2026-03-18 15:19:10.926+00');
INSERT INTO public.products VALUES ('p089', 'KLOW (TB 10mg + BPC 10mg + KPV 10mg + GHK 50mg)', 160.00, true, NULL, 89, '2026-03-18 15:19:10.929+00', '2026-03-18 15:19:10.929+00');
INSERT INTO public.products VALUES ('p090', 'PE-22-28 10mg', 70.00, true, NULL, 90, '2026-03-18 15:19:10.931+00', '2026-03-18 15:19:10.931+00');
INSERT INTO public.products VALUES ('p091', 'Ara-290 16mg', 60.00, true, NULL, 91, '2026-03-18 15:19:10.934+00', '2026-03-18 15:19:10.934+00');
INSERT INTO public.products VALUES ('p092', 'Tri-Heal Max (TB4 25mg + BPC 10mg + KPV 10mg)', 380.00, true, NULL, 92, '2026-03-18 15:19:10.936+00', '2026-03-18 15:19:10.936+00');
INSERT INTO public.products VALUES ('p093', 'Slup-332 500mcg', 60.00, true, NULL, 93, '2026-03-18 15:19:10.939+00', '2026-03-18 15:19:10.939+00');
INSERT INTO public.products VALUES ('p094', 'Bam-15 50mg (USA — no resend)', 300.00, true, NULL, 94, '2026-03-18 15:19:10.942+00', '2026-03-18 15:19:10.942+00');
INSERT INTO public.products VALUES ('p095', 'SLU 100mcg / BAM 25mg Blend 60 Tabs', 95.00, true, NULL, 95, '2026-03-18 15:19:10.944+00', '2026-03-18 15:19:10.944+00');
INSERT INTO public.products VALUES ('p096', 'HCG 1000 IU GMP 3ml 10vials', 40.00, true, NULL, 96, '2026-03-18 15:19:10.946+00', '2026-03-18 15:19:10.946+00');
INSERT INTO public.products VALUES ('p097', 'HCG 2000 IU GMP 3ml 10vials', 70.00, true, NULL, 97, '2026-03-18 15:19:10.95+00', '2026-03-18 15:19:10.95+00');
INSERT INTO public.products VALUES ('p098', 'HCG 5000 IU GMP 3ml 10vials', 175.00, true, NULL, 98, '2026-03-18 15:19:10.952+00', '2026-03-18 15:19:10.952+00');
INSERT INTO public.products VALUES ('p099', 'Glutathione 600mg GMP 10ml 10vials', 45.00, true, NULL, 99, '2026-03-18 15:19:10.955+00', '2026-03-18 15:19:10.955+00');
INSERT INTO public.products VALUES ('p100', 'Glutathione 1500mg GMP 20ml 10vials', 85.00, true, NULL, 100, '2026-03-18 15:19:10.958+00', '2026-03-18 15:19:10.958+00');
INSERT INTO public.products VALUES ('p101', 'HMG 75IU × 10vials GMP', 75.00, true, NULL, 101, '2026-03-18 15:19:10.961+00', '2026-03-18 15:19:10.961+00');
INSERT INTO public.products VALUES ('p102', 'Cerebrolysin 30mg GMP 10ml 10vials', 45.00, true, NULL, 102, '2026-03-18 15:19:10.963+00', '2026-03-18 15:19:10.963+00');
INSERT INTO public.products VALUES ('p103', 'Prostamax 20mg', 120.00, true, NULL, 103, '2026-03-18 15:19:10.966+00', '2026-03-18 15:19:10.966+00');
INSERT INTO public.products VALUES ('p104', 'Pinealon 20mg', 120.00, true, NULL, 104, '2026-03-18 15:19:10.968+00', '2026-03-18 15:19:10.968+00');
INSERT INTO public.products VALUES ('p105', 'Ovagen 20mg', 120.00, true, NULL, 105, '2026-03-18 15:19:10.972+00', '2026-03-18 15:19:10.972+00');
INSERT INTO public.products VALUES ('p106', 'Vesugen 20mg', 120.00, true, NULL, 106, '2026-03-18 15:19:10.974+00', '2026-03-18 15:19:10.974+00');
INSERT INTO public.products VALUES ('p107', 'Bronchogen 20mg', 120.00, true, NULL, 107, '2026-03-18 15:19:10.977+00', '2026-03-18 15:19:10.977+00');
INSERT INTO public.products VALUES ('p108', 'Vilon 20mg', 120.00, true, NULL, 108, '2026-03-18 15:19:10.979+00', '2026-03-18 15:19:10.979+00');
INSERT INTO public.products VALUES ('p109', 'Cartalax 20mg', 120.00, true, NULL, 109, '2026-03-18 15:19:10.982+00', '2026-03-18 15:19:10.982+00');
INSERT INTO public.products VALUES ('p110', 'Cortagen 20mg', 120.00, true, NULL, 110, '2026-03-18 15:19:10.985+00', '2026-03-18 15:19:10.985+00');
INSERT INTO public.products VALUES ('p111', 'Chonluten 20mg', 120.00, true, NULL, 111, '2026-03-18 15:19:10.988+00', '2026-03-18 15:19:10.988+00');
INSERT INTO public.products VALUES ('p112', 'Livagen 20mg', 120.00, true, NULL, 112, '2026-03-18 15:19:10.991+00', '2026-03-18 15:19:10.991+00');
INSERT INTO public.products VALUES ('p113', 'Testagen 20mg', 120.00, true, NULL, 113, '2026-03-18 15:19:10.994+00', '2026-03-18 15:19:10.994+00');
INSERT INTO public.products VALUES ('p114', 'Cardiogen 20mg', 120.00, true, NULL, 114, '2026-03-18 15:19:10.996+00', '2026-03-18 15:19:10.996+00');
INSERT INTO public.products VALUES ('p115', 'Pancragon 20mg', 120.00, true, NULL, 115, '2026-03-18 15:19:10.999+00', '2026-03-18 15:19:10.999+00');
INSERT INTO public.products VALUES ('p116', 'Thymogen 20mg', 120.00, true, NULL, 116, '2026-03-18 15:19:11.002+00', '2026-03-18 15:19:11.002+00');
INSERT INTO public.products VALUES ('p117', 'Crystagen 20mg', 120.00, true, NULL, 117, '2026-03-18 15:19:11.004+00', '2026-03-18 15:19:11.004+00');
INSERT INTO public.products VALUES ('p118', 'Vesilute 20mg', 120.00, true, NULL, 118, '2026-03-18 15:19:11.007+00', '2026-03-18 15:19:11.007+00');
INSERT INTO public.products VALUES ('p119', 'GHK-CU 10g Raw', 85.00, true, NULL, 119, '2026-03-18 15:19:11.01+00', '2026-03-18 15:19:11.01+00');
INSERT INTO public.products VALUES ('p120', 'AHK-CU 10g Raw', 175.00, true, NULL, 120, '2026-03-18 15:19:11.013+00', '2026-03-18 15:19:11.013+00');
INSERT INTO public.products VALUES ('p121', 'SNAP-8 1g', 95.00, true, NULL, 121, '2026-03-18 15:19:11.016+00', '2026-03-18 15:19:11.016+00');
INSERT INTO public.products VALUES ('p122', 'SNAP-8 10g', 785.00, true, NULL, 122, '2026-03-18 15:19:11.018+00', '2026-03-18 15:19:11.018+00');
INSERT INTO public.products VALUES ('p123', 'BPC 157 500mcg Tablets', 55.00, true, NULL, 123, '2026-03-18 15:19:11.021+00', '2026-03-18 15:19:11.021+00');
INSERT INTO public.products VALUES ('p124', 'KPV 500mcg Tablets', 55.00, true, NULL, 124, '2026-03-18 15:19:11.024+00', '2026-03-18 15:19:11.024+00');
INSERT INTO public.products VALUES ('p125', 'Humanin [Purity not Guaranteed]', 155.00, true, NULL, 125, '2026-03-18 15:19:11.027+00', '2026-03-18 15:19:11.027+00');
INSERT INTO public.products VALUES ('p126', 'Orforglipron 12mg', 130.00, true, NULL, 126, '2026-03-18 15:19:11.03+00', '2026-03-18 15:19:11.03+00');


--
-- Data for Name: site_config; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.site_config VALUES ('walletAddress', '0x3B5670Fe10369082297f29eB6dB950C2db7d3659', '2026-03-18 17:33:51.806+00');
INSERT INTO public.site_config VALUES ('walletChangeCodeHash', '41071ea6b4245c84275a8d3de474dda11ae560f5466a9fd407525753fe257e5d', '2026-03-18 17:34:11.004+00');
INSERT INTO public.site_config VALUES ('paymentsEnabled', 'false', '2026-03-19 17:03:36.596+00');


--
-- PostgreSQL database dump complete
--

\unrestrict kBfIbfAyIomyO18afhO6zP0xtEIr7Mtb2xkgCGWXab6anj00d9kXb1a5TqJel46

