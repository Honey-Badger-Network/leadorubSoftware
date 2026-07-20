# Документация лидорубской

# SERVER МОДУЛИ

[CRONES-КРОНЫ]

# setTransfers.js

1) собрать лиды за весь день из SKOROZVON [getLeadsToOneDay()]
2) взять все звонки из RESIDENCE [findAllCallsInResidence()]
3) в цикле масива лидов взять для каждого лида инфу о ЛД попытка трансфера и время звонка [getLeadTimeline()]
4) получить лиды из RESIDENCE и присвоить для лида кто его брокер [getLeadsOnePhone()]
5) получить всяе аудиозаписи лида из SKOROZVON [getLeadAudioUrls()]
6) получить полный обхект ЛД по его имени в лиде [getUserIdByName()]
7) получить сделан ли лид самим холдорубом или бркоером [defaineSelfLead()]
8) узнать лид уникальный или был повтор уже в базе [getInfoLeadIsUnique()]
9) елси не найден бркоер для лида от ЛД из ЗАРПЛАТНАЯ=>ЛИДЫ то искать через ЗАРПЛАТНАЯ=>ЗВОНКИ [foundCallByLeadPhone()]
10) полученым внутри цикла перебора лидов сформировать полный обхект лида и сохранить/обновить в БД [upsertNewLeadsData()]

экспортирутеся эта функция в виде крона [setTransfersCrone] или в виде скрипта [setTransfersToDB]