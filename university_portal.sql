--
-- PostgreSQL database dump
--



-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2025-10-25 14:03:20

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 245 (class 1259 OID 16909)
-- Name: Action; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Action" (
 action_id integer NOT NULL,
 action_name character varying,
 execution_date date,
 annotation text,
 transaction_id integer,
 performer_user_id integer,
 target_department_id integer,
 signature_path character varying
);


ALTER TABLE public."Action" OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16908)
-- Name: Action_action_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Action_action_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Action_action_id_seq" OWNER TO postgres;

--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 244
-- Name: Action_action_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Action_action_id_seq" OWNED BY public."Action".action_id;


--
-- TOC entry 243 (class 1259 OID 16889)
-- Name: Attachment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Attachment" (
 attachment_id integer NOT NULL,
 description character varying,
 file_number character varying,
 attachment_date date,
 file_path character varying,
 publishing_department_id integer,
 transaction_id integer
);


ALTER TABLE public."Attachment" OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16888)
-- Name: Attachment_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Attachment_attachment_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Attachment_attachment_id_seq" OWNER TO postgres;

--
-- TOC entry 5163 (class 0 OID 0)
-- Dependencies: 242
-- Name: Attachment_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Attachment_attachment_id_seq" OWNED BY public."Attachment".attachment_id;


--
-- TOC entry 220 (class 1259 OID 16693)
-- Name: College; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."College" (
 college_id integer NOT NULL,
 college_name character varying
);


ALTER TABLE public."College" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16692)
-- Name: College_college_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."College_college_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."College_college_id_seq" OWNER TO postgres;

--
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 219
-- Name: College_college_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."College_college_id_seq" OWNED BY public."College".college_id;


--
-- TOC entry 222 (class 1259 OID 16703)
-- Name: Department; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Department" (
 department_id integer NOT NULL,
 department_name character varying,
 college_id integer,
 department_type character varying
);


ALTER TABLE public."Department" OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16728)
-- Name: Department_Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Department_Role" (
 dep_role_id integer NOT NULL,
 department_id integer,
 role_id integer
);


ALTER TABLE public."Department_Role" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16727)
-- Name: Department_Role_dep_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Department_Role_dep_role_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Department_Role_dep_role_id_seq" OWNER TO postgres;

--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 225
-- Name: Department_Role_dep_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Department_Role_dep_role_id_seq" OWNED BY public."Department_Role".dep_role_id;


--
-- TOC entry 221 (class 1259 OID 16702)
-- Name: Department_department_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Department_department_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Department_department_id_seq" OWNER TO postgres;

--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 221
-- Name: Department_department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Department_department_id_seq" OWNED BY public."Department".department_id;


--
-- TOC entry 241 (class 1259 OID 16869)
-- Name: Draft; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Draft" (
 draft_id integer NOT NULL,
 transaction_id integer,
 archived_by_user_id integer,
 archive_date timestamp without time zone,
 storage_path character varying
);


ALTER TABLE public."Draft" OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16868)
-- Name: Draft_draft_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Draft_draft_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Draft_draft_id_seq" OWNER TO postgres;

--
-- TOC entry 5167 (class 0 OID 0)
-- Dependencies: 240
-- Name: Draft_draft_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Draft_draft_id_seq" OWNED BY public."Draft".draft_id;


--
-- TOC entry 239 (class 1259 OID 16851)
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
 notification_id integer NOT NULL,
 user_id integer,
 transaction_id integer,
 is_read boolean
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16850)
-- Name: Notification_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Notification_notification_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Notification_notification_id_seq" OWNER TO postgres;

--
-- TOC entry 5168 (class 0 OID 0)
-- Dependencies: 238
-- Name: Notification_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Notification_notification_id_seq" OWNED BY public."Notification".notification_id;


--
-- TOC entry 224 (class 1259 OID 16718)
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
 role_id integer NOT NULL,
 role_name character varying,
 role_level integer
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16717)
-- Name: Role_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Role_role_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Role_role_id_seq" OWNER TO postgres;

--
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 223
-- Name: Role_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_role_id_seq" OWNED BY public."Role".role_id;


--
-- TOC entry 234 (class 1259 OID 16784)
-- Name: Transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Transaction" (
 transaction_id integer NOT NULL,
 content text,
 sender_user_id integer,
 type_id integer,
 parent_transaction_id integer,
 current_status character varying,
 code character varying,
 date date,
 subject character varying
);


ALTER TABLE public."Transaction" OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16826)
-- Name: Transaction_Path; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Transaction_Path" (
 path_id integer NOT NULL,
 transaction_id integer,
 from_department_id integer,
 to_department_id integer,
 path_notes text,
 created_at timestamp without time zone
);


ALTER TABLE public."Transaction_Path" OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16825)
-- Name: Transaction_Path_path_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Transaction_Path_path_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Transaction_Path_path_id_seq" OWNER TO postgres;

--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 236
-- Name: Transaction_Path_path_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Transaction_Path_path_id_seq" OWNED BY public."Transaction_Path".path_id;


--
-- TOC entry 235 (class 1259 OID 16808)
-- Name: Transaction_Receiver; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Transaction_Receiver" (
 transaction_id integer NOT NULL,
 receiver_user_id integer NOT NULL
);


ALTER TABLE public."Transaction_Receiver" OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16774)
-- Name: Transaction_Type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Transaction_Type" (
 type_id integer NOT NULL,
 type_name character varying
);


ALTER TABLE public."Transaction_Type" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16773)
-- Name: Transaction_Type_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Transaction_Type_type_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Transaction_Type_type_id_seq" OWNER TO postgres;

--
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 231
-- Name: Transaction_Type_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Transaction_Type_type_id_seq" OWNED BY public."Transaction_Type".type_id;


--
-- TOC entry 233 (class 1259 OID 16783)
-- Name: Transaction_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Transaction_transaction_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."Transaction_transaction_id_seq" OWNER TO postgres;

--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 233
-- Name: Transaction_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Transaction_transaction_id_seq" OWNED BY public."Transaction".transaction_id;


--
-- TOC entry 228 (class 1259 OID 16746)
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
 user_id integer NOT NULL,
 full_name character varying,
 email character varying,
 password_hash character varying,
 password character varying,
 mobile_number character varying,
 landline character varying,
 fax_number character varying,
 profile_picture character varying,
 signature_path character varying,
 is_first_login boolean
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16756)
-- Name: User_Membership; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User_Membership" (
 user_membership_id integer NOT NULL,
 user_id integer,
 dep_role_id integer,
 start_date date
);


ALTER TABLE public."User_Membership" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16755)
-- Name: User_Membership_user_membership_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_Membership_user_membership_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."User_Membership_user_membership_id_seq" OWNER TO postgres;

--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 229
-- Name: User_Membership_user_membership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_Membership_user_membership_id_seq" OWNED BY public."User_Membership".user_membership_id;


--
-- TOC entry 227 (class 1259 OID 16745)
-- Name: User_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_user_id_seq"
 AS integer
 START WITH 1
 INCREMENT BY 1
 NO MINVALUE
 NO MAXVALUE
 CACHE 1;


ALTER SEQUENCE public."User_user_id_seq" OWNER TO postgres;

--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 227
-- Name: User_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_user_id_seq" OWNED BY public."User".user_id;


--
-- TOC entry 4932 (class 2604 OID 16912)
-- Name: Action action_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Action" ALTER COLUMN action_id SET DEFAULT nextval('public."Action_action_id_seq"'::regclass);


--
-- TOC entry 4931 (class 2604 OID 16892)
-- Name: Attachment attachment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment" ALTER COLUMN attachment_id SET DEFAULT nextval('public."Attachment_attachment_id_seq"'::regclass);


--
-- TOC entry 4920 (class 2604 OID 16696)
-- Name: College college_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."College" ALTER COLUMN college_id SET DEFAULT nextval('public."College_college_id_seq"'::regclass);


--
-- TOC entry 4921 (class 2604 OID 16706)
-- Name: Department department_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department" ALTER COLUMN department_id SET DEFAULT nextval('public."Department_department_id_seq"'::regclass);


--
-- TOC entry 4923 (class 2604 OID 16731)
-- Name: Department_Role dep_role_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department_Role" ALTER COLUMN dep_role_id SET DEFAULT nextval('public."Department_Role_dep_role_id_seq"'::regclass);


--
-- TOC entry 4930 (class 2604 OID 16872)
-- Name: Draft draft_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Draft" ALTER COLUMN draft_id SET DEFAULT nextval('public."Draft_draft_id_seq"'::regclass);


--
-- TOC entry 4929 (class 2604 OID 16854)
-- Name: Notification notification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN notification_id SET DEFAULT nextval('public."Notification_notification_id_seq"'::regclass);


--
-- TOC entry 4922 (class 2604 OID 16721)
-- Name: Role role_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN role_id SET DEFAULT nextval('public."Role_role_id_seq"'::regclass);


--
-- TOC entry 4927 (class 2604 OID 16787)
-- Name: Transaction transaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction" ALTER COLUMN transaction_id SET DEFAULT nextval('public."Transaction_transaction_id_seq"'::regclass);


--
-- TOC entry 4928 (class 2604 OID 16829)
-- Name: Transaction_Path path_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Path" ALTER COLUMN path_id SET DEFAULT nextval('public."Transaction_Path_path_id_seq"'::regclass);


--
-- TOC entry 4926 (class 2604 OID 16777)
-- Name: Transaction_Type type_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Type" ALTER COLUMN type_id SET DEFAULT nextval('public."Transaction_Type_type_id_seq"'::regclass);


--
-- TOC entry 4924 (class 2604 OID 16749)
-- Name: User user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN user_id SET DEFAULT nextval('public."User_user_id_seq"'::regclass);


--
-- TOC entry 4925 (class 2604 OID 16759)
-- Name: User_Membership user_membership_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User_Membership" ALTER COLUMN user_membership_id SET DEFAULT nextval('public."User_Membership_user_membership_id_seq"'::regclass);


--
-- TOC entry 5156 (class 0 OID 16909)
-- Dependencies: 245
-- Data for Name: Action; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5154 (class 0 OID 16889)
-- Dependencies: 243
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5131 (class 0 OID 16693)
-- Dependencies: 220
-- Data for Name: College; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5133 (class 0 OID 16703)
-- Dependencies: 222
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5137 (class 0 OID 16728)
-- Dependencies: 226
-- Data for Name: Department_Role; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5152 (class 0 OID 16869)
-- Dependencies: 241
-- Data for Name: Draft; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5150 (class 0 OID 16851)
-- Dependencies: 239
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5135 (class 0 OID 16718)
-- Dependencies: 224
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5145 (class 0 OID 16784)
-- Dependencies: 234
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5148 (class 0 OID 16826)
-- Dependencies: 237
-- Data for Name: Transaction_Path; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5146 (class 0 OID 16808)
-- Dependencies: 235
-- Data for Name: Transaction_Receiver; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5143 (class 0 OID 16774)
-- Dependencies: 232
-- Data for Name: Transaction_Type; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5139 (class 0 OID 16746)
-- Dependencies: 228
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5141 (class 0 OID 16756)
-- Dependencies: 230
-- Data for Name: User_Membership; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 244
-- Name: Action_action_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Action_action_id_seq"', 1, false);


--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 242
-- Name: Attachment_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Attachment_attachment_id_seq"', 1, false);


--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 219
-- Name: College_college_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."College_college_id_seq"', 1, false);


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 225
-- Name: Department_Role_dep_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Department_Role_dep_role_id_seq"', 1, false);


--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 221
-- Name: Department_department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Department_department_id_seq"', 1, false);


--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 240
-- Name: Draft_draft_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Draft_draft_id_seq"', 1, false);


--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 238
-- Name: Notification_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Notification_notification_id_seq"', 1, false);


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 223
-- Name: Role_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_role_id_seq"', 1, false);


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 236
-- Name: Transaction_Path_path_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Transaction_Path_path_id_seq"', 1, false);


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 231
-- Name: Transaction_Type_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Transaction_Type_type_id_seq"', 1, false);


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 233
-- Name: Transaction_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Transaction_transaction_id_seq"', 1, false);


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 229
-- Name: User_Membership_user_membership_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_Membership_user_membership_id_seq"', 1, false);


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 227
-- Name: User_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_user_id_seq"', 1, false);


--
-- TOC entry 4960 (class 2606 OID 16917)
-- Name: Action Action_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Action"
 ADD CONSTRAINT "Action_pkey" PRIMARY KEY (action_id);


--
-- TOC entry 4958 (class 2606 OID 16897)
-- Name: Attachment Attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
 ADD CONSTRAINT "Attachment_pkey" PRIMARY KEY (attachment_id);


--
-- TOC entry 4934 (class 2606 OID 16701)
-- Name: College College_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."College"
 ADD CONSTRAINT "College_pkey" PRIMARY KEY (college_id);


--
-- TOC entry 4940 (class 2606 OID 16734)
-- Name: Department_Role Department_Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department_Role"
 ADD CONSTRAINT "Department_Role_pkey" PRIMARY KEY (dep_role_id);


--
-- TOC entry 4936 (class 2606 OID 16711)
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department"
 ADD CONSTRAINT "Department_pkey" PRIMARY KEY (department_id);


--
-- TOC entry 4956 (class 2606 OID 16877)
-- Name: Draft Draft_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Draft"
 ADD CONSTRAINT "Draft_pkey" PRIMARY KEY (draft_id);


--
-- TOC entry 4954 (class 2606 OID 16857)
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
 ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (notification_id);


--
-- TOC entry 4938 (class 2606 OID 16726)
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
 ADD CONSTRAINT "Role_pkey" PRIMARY KEY (role_id);


--
-- TOC entry 4952 (class 2606 OID 16834)
-- Name: Transaction_Path Transaction_Path_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Path"
 ADD CONSTRAINT "Transaction_Path_pkey" PRIMARY KEY (path_id);


--
-- TOC entry 4950 (class 2606 OID 16814)
-- Name: Transaction_Receiver Transaction_Receiver_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Receiver"
 ADD CONSTRAINT "Transaction_Receiver_pkey" PRIMARY KEY (transaction_id, receiver_user_id);


--
-- TOC entry 4946 (class 2606 OID 16782)
-- Name: Transaction_Type Transaction_Type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Type"
 ADD CONSTRAINT "Transaction_Type_pkey" PRIMARY KEY (type_id);


--
-- TOC entry 4948 (class 2606 OID 16792)
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
 ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (transaction_id);


--
-- TOC entry 4944 (class 2606 OID 16762)
-- Name: User_Membership User_Membership_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User_Membership"
 ADD CONSTRAINT "User_Membership_pkey" PRIMARY KEY (user_membership_id);


--
-- TOC entry 4942 (class 2606 OID 16754)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
  ADD CONSTRAINT "User_pkey" PRIMARY KEY (user_id);


--
-- TOC entry 4980 (class 2606 OID 16923)
-- Name: Action Action_performer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Action"
  ADD CONSTRAINT "Action_performer_user_id_fkey" FOREIGN KEY (performer_user_id) REFERENCES public."User"(user_id);


--
-- TOC entry 4981 (class 2606 OID 16928)
-- Name: Action Action_target_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Action"
 ADD CONSTRAINT "Action_target_department_id_fkey" FOREIGN KEY (target_department_id) REFERENCES public."Department"(department_id);


--
-- TOC entry 4982 (class 2606 OID 16918)
-- Name: Action Action_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Action"
 ADD CONSTRAINT "Action_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4978 (class 2606 OID 16898)
-- Name: Attachment Attachment_publishing_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
 ADD CONSTRAINT "Attachment_publishing_department_id_fkey" FOREIGN KEY (publishing_department_id) REFERENCES public."Department"(department_id);


--
-- TOC entry 4979 (class 2606 OID 16903)
-- Name: Attachment Attachment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
 ADD CONSTRAINT "Attachment_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4962 (class 2606 OID 16735)
-- Name: Department_Role Department_Role_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department_Role"
 ADD CONSTRAINT "Department_Role_department_id_fkey" FOREIGN KEY (department_id) REFERENCES public."Department"(department_id);


--
-- TOC entry 4963 (class 2606 OID 16740)
-- Name: Department_Role Department_Role_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department_Role"
 ADD CONSTRAINT "Department_Role_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(role_id);


--
-- TOC entry 4961 (class 2606 OID 16712)
-- Name: Department Department_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department"
 ADD CONSTRAINT "Department_college_id_fkey" FOREIGN KEY (college_id) REFERENCES public."College"(college_id);


--
-- TOC entry 4976 (class 2606 OID 16883)
-- Name: Draft Draft_archived_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Draft"
 ADD CONSTRAINT "Draft_archived_by_user_id_fkey" FOREIGN KEY (archived_by_user_id) REFERENCES public."User"(user_id);


--
-- TOC entry 4977 (class 2606 OID 16878)
-- Name: Draft Draft_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Draft"
 ADD CONSTRAINT "Draft_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4974 (class 2606 OID 16863)
-- Name: Notification Notification_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
 ADD CONSTRAINT "Notification_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4975 (class 2606 OID 16858)
-- Name: Notification Notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
   ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(user_id);


--
-- TOC entry 4971 (class 2606 OID 16840)
-- Name: Transaction_Path Transaction_Path_from_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Path"
   ADD CONSTRAINT "Transaction_Path_from_department_id_fkey" FOREIGN KEY (from_department_id) REFERENCES public."Department"(department_id);


--
-- TOC entry 4972 (class 2606 OID 16845)
-- Name: Transaction_Path Transaction_Path_to_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Path"
   ADD CONSTRAINT "Transaction_Path_to_department_id_fkey" FOREIGN KEY (to_department_id) REFERENCES public."Department"(department_id);


--
-- TOC entry 4973 (class 2606 OID 16835)
-- Name: Transaction_Path Transaction_Path_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Path"
   ADD CONSTRAINT "Transaction_Path_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4969 (class 2606 OID 16820)
-- Name: Transaction_Receiver Transaction_Receiver_receiver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Receiver"
   ADD CONSTRAINT "Transaction_Receiver_receiver_user_id_fkey" FOREIGN KEY (receiver_user_id) REFERENCES public."User"(user_id);


--
-- TOC entry 4970 (class 2606 OID 16815)
-- Name: Transaction_Receiver Transaction_Receiver_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction_Receiver"
   ADD CONSTRAINT "Transaction_Receiver_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4966 (class 2606 OID 16803)
-- Name: Transaction Transaction_parent_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
 ADD CONSTRAINT "Transaction_parent_transaction_id_fkey" FOREIGN KEY (parent_transaction_id) REFERENCES public."Transaction"(transaction_id);


--
-- TOC entry 4967 (class 2606 OID 16793)
-- Name: Transaction Transaction_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
   ADD CONSTRAINT "Transaction_sender_user_id_fkey" FOREIGN KEY (sender_user_id) REFERENCES public."User"(user_id);


--
-- TOC entry 4968 (class 2606 OID 16798)
-- Name: Transaction Transaction_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transaction"
   ADD CONSTRAINT "Transaction_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public."Transaction_Type"(type_id);


--
-- TOC entry 4964 (class 2606 OID 16768)
-- Name: User_Membership User_Membership_dep_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User_Membership"
   ADD CONSTRAINT "User_Membership_dep_role_id_fkey" FOREIGN KEY (dep_role_id) REFERENCES public."Department_Role"(dep_role_id);


--
-- TOC entry 4965 (class 2606 OID 16763)
-- Name: User_Membership User_Membership_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User_Membership"
   ADD CONSTRAINT "User_Membership_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(user_id);


-- Completed on 2025-10-25 14:03:20

--
-- PostgreSQL database dump complete
--