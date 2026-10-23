<template>

</template>

<script>

    import dayjs from 'dayjs'

    export default {
        data() {
            return {
                gte: dayjs(new Date).format('YYYY-MM-DD'),
                lte: dayjs(new Date).format('YYYY-MM-DD'),
            }
        },
        methods: {
            async fetchProjectsAnalytics() {
                try {

                } catch (e) {
                    console.log(e.message)
                }
            }
        }
    }

</script>