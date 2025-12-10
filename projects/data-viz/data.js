// 英语积累系统 - 数据文件
const modesData = {
    mode1: {
        icon: '🔗',
        title: '逻辑与过渡模式',
        description: '用于连接句子、段落，表达逻辑关系和思维转折的表达模式',
        patterns: [
            {
                formula: 'Furthermore, S+V.',
                function: '递进。含义：此外，而且（正式）',
                examples: [
                    'The restaurant has great food. Furthermore, the service is excellent.',
                    'I enjoy reading books. Furthermore, it helps me relax after work.',
                    'This phone has a good camera. Furthermore, the battery lasts all day.',
                    'She is a talented singer. Furthermore, she writes her own songs.',
                    'The apartment is close to my office. Furthermore, the rent is affordable.'
                ]
            },
            {
                formula: 'Moreover, S+V.',
                function: '递进。含义：此外，再者（更正式）',
                examples: [
                    'The weather is perfect today. Moreover, we have no plans, so we can go anywhere.',
                    'He is always on time. Moreover, he never complains about extra work.',
                    'The movie was entertaining. Moreover, it had a meaningful message.',
                    'This coffee shop is cozy. Moreover, they serve the best pastries in town.',
                    'Learning a new language is challenging. Moreover, it requires daily practice.'
                ]
            },
            {
                formula: 'That being said, S+V.',
                function: '转折/让步。话虽如此；尽管那样（口语高频）',
                examples: [
                    'The hotel is a bit expensive. That being said, the location is perfect.',
                    'I love pizza. That being said, I try not to eat it too often.',
                    "It’s a great idea. That being said, we don't have the budget for it.",
                    'She can be difficult sometimes. That being said, she is a loyal friend.',
                    'The class is challenging. That being said, I am learning a lot.'
                ]
            },
            {
                formula: 'In contrast to N, S+V.',
                function: '对比。与...形成对比的是',
                examples: [
                    'In contrast to my brother, I prefer staying home on weekends.',
                    'In contrast to last year, this summer has been much cooler.',
                    'In contrast to coffee, tea helps me sleep better.',
                    'In contrast to the book, the movie was disappointing.',
                    'In contrast to her sister, she is very outgoing.',
                ]
            },
            {
                formula: 'Conversely, S+V.',
                function: '对比/反面。相反地；反过来（正式）',
                examples: [
                    'Demand for the product is high; conversely, the supply is dwindling.',
                    "[市场研究/消费行为]High prices often drive down consumer demand for luxury goods. Conversely, promotional sales campaigns usually lead to an immediate surge in purchases.",
                    "[管理与组织]Excessive supervision can stifle creativity and autonomy among employees. Conversely, giving teams greater independence typically results in higher innovation rates.",
                    "[国际关系/政治]A strong national economy tends to stabilize the domestic political landscape. Conversely, periods of high unemployment frequently lead to civil unrest and dissatisfaction.",
                    "[健康与营养学]A sedentary lifestyle is known to increase the risk of cardiovascular disease. Conversely, incorporating just thirty minutes of daily exercise significantly lowers that risk.",
                ]
            },
            {
                formula: 'In light of [noun/fact], S+V.',
                function: '基于某个事实或情况，引出结论或行动',
                examples: [
                    'In light of recent developments, we need to revise our strategy.',
                    'In light of the evidence presented, the committee decided to approve the proposal.'
                ]
            },
            {
                formula: 'By the same token, S+V.',
                function: '表示"同样地"，用于引出类似的观点或情况',
                examples: [
                    'We need to reduce costs. By the same token, we must maintain quality standards.',
                    'Students should work hard. By the same token, teachers should provide adequate support.'
                ]
            },
            {
                formula: 'To that end, S+V.',
                function: '为了实现前面提到的目标，引出具体措施',
                examples: [
                    'We aim to improve customer satisfaction. To that end, we have implemented a new feedback system.',
                    'The goal is carbon neutrality by 2030. To that end, the company is investing in renewable energy.'
                ]
            },
            {
                formula: 'With that in mind, S+V.',
                function: '考虑到前面提到的情况，引出相应的行动或建议',
                examples: [
                    'The deadline is approaching quickly. With that in mind, let\'s prioritize the critical tasks.',
                    'Budget constraints are significant. With that in mind, we should focus on cost-effective solutions.'
                ]
            }
        ]
    },
    mode2: {
        icon: '💭',
        title: '观点与让步模式',
        description: '表达观点、承认对立面、进行让步和反驳的表达模式',
        patterns: [
            {
                formula: 'While it is true that [clause], S+V.',
                function: '承认某个事实，但引出不同的观点或补充',
                examples: [
                    'While it is true that technology has improved efficiency, it has also created new challenges.',
                    'While it is true that the economy is growing, income inequality remains a serious concern.'
                ]
            },
            {
                formula: 'Granted, [clause], but S+V.',
                function: '承认某个观点或事实，然后提出反驳或限制',
                examples: [
                    'Granted, the solution is expensive, but it will save money in the long run.',
                    'Granted, he lacks experience, but his innovative thinking is valuable.'
                ]
            },
            {
                formula: 'It could be argued that [clause], however, S+V.',
                function: '提出一个可能的观点，然后表达不同看法',
                examples: [
                    'It could be argued that remote work reduces productivity, however, studies show the opposite.',
                    'It could be argued that AI will replace jobs, however, it also creates new opportunities.'
                ]
            },
            {
                formula: 'To be fair, [clause], yet S+V.',
                function: '公平地承认某个观点，但引出转折',
                examples: [
                    'To be fair, the team worked hard, yet the results were disappointing.',
                    'To be fair, the policy has good intentions, yet its implementation is flawed.'
                ]
            }
        ]
    },
    mode3: {
        icon: '🏗️',
        title: '核心句法框架',
        description: '常用的句式结构和语法框架，构建复杂句子的基础',
        patterns: [
            {
                formula: 'It is [adj] that S+V.',
                function: '强调某个事实或观点的重要性、必要性等',
                examples: [
                    'It is essential that we address climate change immediately.',
                    'It is remarkable that she achieved so much in such a short time.'
                ]
            },
            {
                formula: 'What [S+V] is [noun/clause].',
                function: '使用 what 引导的主语从句强调重点',
                examples: [
                    'What matters most is the quality of our work.',
                    'What we need to understand is that change takes time.'
                ]
            },
            {
                formula: 'Not only [S+V], but also [S+V].',
                function: '表示递进关系，强调两个方面',
                examples: [
                    'Not only did she complete the project, but also she exceeded expectations.',
                    'The program not only reduces costs, but also improves efficiency.'
                ]
            },
            {
                formula: 'The more [S+V], the more [S+V].',
                function: '表示两个事物成正比关系',
                examples: [
                    'The more you practice, the better you become.',
                    'The more data we collect, the more accurate our predictions are.'
                ]
            },
            {
                formula: 'So [adj/adv] ... that S+V.',
                function: '表示程度，引出结果',
                examples: [
                    'The problem was so complex that it took months to solve.',
                    'She spoke so eloquently that everyone was convinced.'
                ]
            },
            {
                formula: 'Whether ... or ..., S+V.',
                function: '表示无论哪种情况，结果都一样',
                examples: [
                    'Whether you agree or disagree, the decision has been made.',
                    'Whether it rains or shines, the event will proceed as planned.'
                ]
            }
        ]
    },
    mode4: {
        icon: '🔤',
        title: '动词/名词搭配模式',
        description: '高频词汇搭配和固定短语，提升表达的地道性',
        patterns: [
            {
                formula: 'make/take/have + [noun]',
                function: '常用动词与名词的固定搭配',
                examples: [
                    'make a decision, make progress, make an effort',
                    'take action, take responsibility, take advantage of',
                    'have an impact, have access to, have the opportunity'
                ]
            },
            {
                formula: 'play a [adj] role in [noun/gerund]',
                function: '表示在某事中扮演角色或起作用',
                examples: [
                    'Technology plays a crucial role in modern education.',
                    'Leadership plays a vital role in organizational success.'
                ]
            },
            {
                formula: 'pose/present a [noun]',
                function: '表示提出、造成某种情况',
                examples: [
                    'Climate change poses a significant threat to biodiversity.',
                    'The new regulations present a challenge for small businesses.'
                ]
            },
            {
                formula: 'raise/address/tackle [issue/concern/question]',
                function: '处理问题、关注点的常用动词',
                examples: [
                    'The report raises important questions about data privacy.',
                    'We need to address these concerns immediately.',
                    'The government is tackling the housing crisis.'
                ]
            },
            {
                formula: 'gain/acquire/obtain [noun]',
                function: '获得、取得的不同表达',
                examples: [
                    'She gained valuable experience during the internship.',
                    'The company acquired new technology to improve production.',
                    'Students can obtain certification upon completion.'
                ]
            },
            {
                formula: 'undergo/experience [change/transformation]',
                function: '经历变化或转变',
                examples: [
                    'The industry is undergoing rapid transformation.',
                    'Many countries experienced significant economic growth.'
                ]
            },
            {
                formula: 'demonstrate/exhibit/display [quality/characteristic]',
                function: '展示、表现某种特质',
                examples: [
                    'The team demonstrated exceptional teamwork.',
                    'The data exhibits a clear pattern.',
                    'She displayed remarkable resilience.'
                ]
            },
            {
                formula: 'foster/promote/encourage [noun/gerund]',
                function: '促进、鼓励某事发展',
                examples: [
                    'The program fosters innovation and creativity.',
                    'We should promote sustainable practices.',
                    'The policy encourages investment in renewable energy.'
                ]
            }
        ]
    },
    mode5: {
        icon: '⚡',
        title: '实用功能性模式',
        description: '日常交流和学术写作中的实用表达和功能性短语',
        patterns: [
            {
                formula: 'When it comes to [noun/gerund], S+V.',
                function: '谈到、涉及某个话题时',
                examples: [
                    'When it comes to customer service, quality is our top priority.',
                    'When it comes to learning languages, practice is essential.'
                ]
            },
            {
                formula: 'There is no denying that S+V.',
                function: '不可否认，强调某个事实',
                examples: [
                    'There is no denying that climate change is a global challenge.',
                    'There is no denying that technology has transformed our lives.'
                ]
            },
            {
                formula: 'It goes without saying that S+V.',
                function: '不言而喻，表示显而易见的事实',
                examples: [
                    'It goes without saying that education is important.',
                    'It goes without saying that we need to meet the deadline.'
                ]
            },
            {
                formula: 'From [perspective/point of view], S+V.',
                function: '从某个角度或观点来看',
                examples: [
                    'From an economic perspective, the policy makes sense.',
                    'From my point of view, we should prioritize quality over quantity.'
                ]
            },
            {
                formula: 'In terms of [noun], S+V.',
                function: '在某方面、就某事而言',
                examples: [
                    'In terms of performance, this model is superior.',
                    'In terms of cost-effectiveness, the solution is ideal.'
                ]
            }
        ]
    }
};

